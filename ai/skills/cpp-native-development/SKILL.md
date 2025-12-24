---
name: cpp-native-development
description: Modern C++17/20 patterns for native application development. Use when writing C++, reviewing diffs, or discussing performance. Covers move semantics, templates vs std::function, thread safety, STL containers, async patterns, struct initialization, and API design.
---

Guidance for writing performant, modern C++ in native application codebases.

## Philosophy

C++ gives you control over every allocation and copy. Use that control intentionally. The compiler is your ally—let it inline, optimize, and catch errors at compile time rather than runtime.

Key questions before writing:

- Will this allocate? Does it need to?
- Is this thread-safe? Does it need to be?
- Can the compiler optimize this, or am I hiding information?
- Are struct fields properly initialized?

## Struct Initialization

Initialize struct members. C++ does not zero-initialize variables—uninitialized fields contain garbage:

```cpp
// ❌ packet_loss may contain random garbage
struct ConnectionInfo {
    double packet_loss;
    int retries;
};

// ✅ Explicit default values
struct ConnectionInfo {
    double packet_loss { 0.0 };
    int retries { 0 };
};
```

## Templates Over std::function

Prefer templates for callbacks in hot paths. `std::function` has overhead: type erasure, potential heap allocation, and prevents inlining.

```cpp
// ❌ Allocates, type-erases, prevents inlining
void ForEach(std::function<void(const Item&)> fn);

// ✅ Zero-cost, inlineable
template<typename Fn>
void ForEach(Fn&& fn) {
    for (auto& item : m_Items) {
        fn(item);
    }
}
```

When std::function is acceptable: stored callbacks (member variables, queues), virtual interfaces, cold paths where readability wins.

## Move Semantics

Use `&&` to signal consumption. When a function consumes a large object, make it explicit:

```cpp
// ❌ Ambiguous: copies or moves?
void ReplaceData(std::unordered_map<K, V> data);

// ✅ Explicit: caller must move
void ReplaceData(std::unordered_map<K, V>&& data);
```

Use std::exchange for move-and-clear—it's semantically correct where std::move leaves undefined state:

```cpp
// ✅ Atomic move-and-clear
auto callback = std::exchange(m_Callback, nullptr);
if (callback) callback();
```

## Lifetime and Ownership

Extract callbacks before invoking to avoid destroying the owner mid-execution:

```cpp
// ❌ UB: destroying callback storage while executing callback
task->OnComplete = [task] (auto result) {
    task->OnComplete = nullptr;  // Destroys ourselves!
};

// ✅ Exchange callback out before invoking
void Task::Finish(Response response) {
    auto on_complete = std::exchange(OnComplete, nullptr);
    on_complete(std::move(response));
}
```

Use weak_from_this() for async callbacks to allow natural destruction:

```cpp
m_Thread->Post([weak = weak_from_this()] {
    if (auto self = weak.lock()) {
        self->DoWork();
    }
});
```

Remove unused enable_shared_from_this bases.

## Thread Safety

Assert thread context at function entry:

```cpp
void ProcessMessage(const Message& msg) {
    assert(m_Thread->IsCurrent());
}
```

Connect to signals before calling handlers for initial state—prevents races where a signal fires between registration and initial call:

```cpp
// ❌ Race: may miss signal between handler call and registration
handler();
signal.connect(&handler);

// ✅ Connect first, then call for initialization
signal.connect(&handler);
handler();  // Safe: any signal after this point is caught
```

Check conditions inside the lock, not before:

```cpp
// ❌ Race: condition may change between check and lock
if (m_Invalidated) return;
std::lock_guard lock(m_Mutex);

// ✅ Check under lock
std::lock_guard lock(m_Mutex);
if (m_Invalidated) return;
```

Avoid atomics for complex state—they don't protect multi-field updates. Use mutex when consistency matters.

Avoid ObjC `atomic` property attribute—it uses locks on every access and still isn't thread-safe for compound operations.

## Lifecycle Management

When managing thread lifecycle with Start/Stop APIs, use two locks to prevent deadlock:

```cpp
static struct {
    std::mutex mutex;
    std::thread thread;
} g_Lifecycle;

static struct {
    std::mutex mutex;
    unsigned ref_count { 0 };
} g_State;

void Start() {
    std::lock_guard lifecycle_lock(g_Lifecycle.mutex);
    {
        std::lock_guard state_lock(g_State.mutex);
        if (++g_State.ref_count > 1) return;  // Already started
    }
    g_Lifecycle.thread = std::thread([] { /* ... */ });
}

void Stop() {
    std::lock_guard lifecycle_lock(g_Lifecycle.mutex);

    // Prevent self-deadlock
    if (g_Lifecycle.thread.get_id() == std::this_thread::get_id())
        std::terminate();

    {
        std::lock_guard state_lock(g_State.mutex);
        if (--g_State.ref_count > 0) return;  // Still referenced
    }

    if (g_Lifecycle.thread.joinable())
        g_Lifecycle.thread.join();
}
```

Why two locks? The thread must check `ref_count` without holding the lifecycle lock (which would deadlock on join). Outer lock serializes lifecycle operations; inner lock protects state the thread reads.

## API Design

Prefer specific callbacks over optional wrappers:

```cpp
// ❌ Awkward
void OnCursorColor(std::optional<std::shared_ptr<Peer>>, CursorColor);

// ✅ Explicit methods
void OnRemoteCursorColor(std::shared_ptr<Peer>, CursorColor);
void OnLocalCursorColor(CursorColor);
```

Use diff structures for change notifications:

```cpp
struct ContactsDiff {
    std::vector<Contact> added;
    std::vector<Contact> changed;
    std::vector<Contact> removed;
};
void OnContactsChanged(const ContactsDiff& diff);
```

Restrict access to internals—expose iterators or specific accessors rather than copying entire containers:

```cpp
// ❌ Exposes internal structure, forces copy
Headers Headers() const { return m_Headers; }

// ✅ Zero-copy iteration, can change internal structure later
auto HeadersBegin() const { return m_Headers.cbegin(); }
auto HeadersEnd() const { return m_Headers.cend(); }
auto HeaderValue(const std::string& key) { return m_Headers[key]; }
```

## STL Containers

Erase before emplace_hint for updates:

```cpp
// ✅ Erase first, then emplace at hint
if (auto it = set.find(item); it != set.end()) {
    set.emplace_hint(set.erase(it), std::move(newItem));
}
```

Prefer unordered containers for O(1) lookups. Use std::map only when ordering matters.

## Type Safety

Prefer `enum class` over plain `enum` for type-safe enumerations:

```cpp
// ❌ Implicit conversions, pollutes namespace
enum FlushReason { Requested, BufferFull, Timeout };
auto reason = Requested;  // Compiles without qualification

// ✅ Explicit, type-safe, compiler enforces exhaustive switch
enum class FlushReason { Requested, BufferFull, Timeout };
auto reason = FlushReason::Requested;
```

With `enum class`, you can remove fallback "unknown" cases—the compiler ensures exhaustive handling.

Delete default constructors when uninitialized state is dangerous:

```cpp
// ❌ Default-constructed instance has garbage values
struct Ratios {
    float x, y;
};

// ✅ Force explicit initialization
struct Ratios {
    float x, y;
    Ratios() = delete;
    Ratios(float x, float y) : x(x), y(y) {}
};
```

## Dependency Management

Break compilation cascades by extracting nested types:

```cpp
// ❌ Nested type forces full Peer.h inclusion
void OnLocalSdpTypeChange(Peer::SdpType type);

// ✅ Top-level type can be forward declared
enum class SdpType { Unknown, Offer, Answer };
void OnLocalSdpTypeChange(SdpType type);  // Only needs forward decl
```

Use relative includes within modules to make dependencies explicit:

```cpp
// ✅ Clear module boundary
#include "../Call.h"
#include "../Peer.h"
```

## String Handling

Prefer `string_view` for read-only access and return values from pure functions:

```cpp
// ❌ Raw pointer, no size information
static const char* FlushReasonToString(FlushReason reason);

// ✅ Zero-copy, type-safe, includes length
static std::string_view FlushReasonToString(FlushReason reason);

// ✅ Direct from null-terminated string
OnMessage(message.body.UTF8String);
```

## Defensive Patterns

Guard against null before crash, optionally with assert:

```cpp
if (m_Channels.empty()) {
    assert(false && "BroadcastUnbuffered called with no channels");
    return;
}
```

Comment non-obvious safety decisions:

```cpp
// DataChannel may be destroyed before task executes
auto data = event->Encode();
m_NetworkThread->PostTask([data = std::move(data), channel] { ... });
```

Prefer explicit state tracking over relying on external API behavior:

```cpp
struct Context {
    bool isSuspended { false };   // Source of truth
    bool isInvalidated { false };
    // Don't rely on external API state queries
};
```

## Deferred Destruction

When destruction races with platform callbacks, delay cleanup:

```cpp
void Invalidate() {
    m_Invalidated = true;

    // Keep context alive for pending callbacks
    // (e.g., macOS event tap callbacks may fire after disable)
    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC),
        dispatch_get_main_queue(),
        ^{ /* prevents premature deallocation */ }
    );
}

// Guard in callback
if (m_Invalidated) {
    Log("callback after invalidation");
    return;
}
```

Document platform bug workarounds: the bug, reference if available, why this approach works.

## Anti-Patterns

- Unnecessary shared_ptr—borrow with const& when ownership isn't transferred
- Copying in range-for—use `const auto&`
- Holding locks during callbacks—copy, release, then call

## Remember

- Initialize all struct fields—C++ doesn't zero them
- `enum class` over `enum` for type safety
- `string_view` over `const char*` for return values
- std::exchange over std::move when nulling callbacks
- Weak pointers for async to prevent use-after-free
- Check state under lock, not before acquiring it
- Templates over std::function for hot-path callbacks
- Diff structures communicate what changed
- Deferred destruction when callbacks race with cleanup
- Comment why when the safety reason isn't obvious
- Connect to signals before calling handlers for initialization
- Two-lock pattern for lifecycle with ref-counted threads
- Delete dangerous default constructors
- Extract nested types to break compilation cascades
- Expose iterators over container access for encapsulation
