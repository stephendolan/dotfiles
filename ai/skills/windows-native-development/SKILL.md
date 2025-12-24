---
name: windows-native-development
description: Windows platform patterns for native application development. Use when writing Windows C++, handling input, managing threads, or working with Win32/COM APIs. Covers message queues, keyboard hooks, SendInput batching, COM resource management, and QueryPerformanceCounter timing.
---

Guidance for writing robust, performant Windows native code.

## Philosophy

Windows development requires explicit resource management and careful attention to threading models. The platform has quirks—embrace them with documented workarounds rather than fighting them.

Key questions:

- Is this on the right thread?
- Are resources being released properly?
- Does input need batching?
- Are there platform-specific edge cases?

## Thread Communication

Use message queues for cross-thread communication. Always queue events—even from the main thread—to guarantee ordering:

```cpp
// Observer callback: minimal work, just queue and post
void OnMediaChange(Call call, MediaState state) {
    std::lock_guard lock(m_Mutex);
    if (!m_Tuple) return;
    media_change.send_emplace(std::move(call), state);
    m_Tuple->post(TupleMessage::MediaChange);
}

// Main thread: centralized processing
void Tuple::on_message(TupleMessage msg) {
    switch (msg) {
    case TupleMessage::MediaChange: {
        auto [call, state] = media_change.receive();
        handle_media_change(std::move(call), state);
        break;
    }
    // ...
    }
}
```

Benefits: Guaranteed ordering, simplified thread safety (only queue operations need locking), easier control flow reasoning.

## Input Batching

Use `SendInputBuffer` pattern for efficient input injection:

```cpp
class SendInputBuffer {
    const uint32_t m_Capacity;
    INPUT* m_Inputs;
    uint32_t m_Count { 0 };
public:
    SendInputBuffer(INPUT* buf, uint32_t cap) : m_Capacity(cap), m_Inputs(buf) {}

    std::optional<uint32_t> write(const INPUT& input) {
        if (m_Count >= m_Capacity) {
            if (auto err = flush()) return err;
        }
        m_Inputs[m_Count++] = input;
        return std::nullopt;
    }

    std::optional<uint32_t> flush() {
        if (m_Count == 0) return std::nullopt;
        UINT sent = SendInput(m_Count, m_Inputs, sizeof(INPUT));
        if (sent < m_Count) return GetLastError();
        m_Count = 0;
        return std::nullopt;
    }
};

// Usage: stack-allocated buffer
INPUT inputs[20];
SendInputBuffer buffer(inputs, 20);
write_keyboard_mods(buffer, flags);  // May write multiple inputs
write_key(buffer, vk, state);        // Auto-flushes when full
buffer.flush();                      // Explicit flush at end
```

## Keyboard State

Distinguish between `GetAsyncKeyState` and `GetKeyState`:

```cpp
// GetAsyncKeyState: current physical state (for modifiers)
KeyState get_async_state(int vk) {
    return (GetAsyncKeyState(vk) < 0) ? KeyState::Down : KeyState::Up;
}

// GetKeyState: toggle state (for Caps Lock, Num Lock)
bool is_caps_lock_on() {
    return (GetKeyState(VK_CAPITAL) & 1) == 1;
}
```

Only send differential updates:

```cpp
static void write_key_diff(SendInputBuffer& buf, int vk,
                           KeyState current, KeyState desired) {
    if (current != desired) {
        write_key(buf, vk, desired);
    }
}
```

## Low-Level Keyboard Hooks

Install hooks only when needed:

```cpp
void update_keyboard_hook(bool keyboard_enabled, CursorMode mode, bool active) {
    bool need_hook = keyboard_enabled
                   && (mode == CursorMode::Mouse)
                   && active;

    if (need_hook != m_HookInstalled) {
        if (need_hook) {
            register_ll_keyboard_hook(this);
        } else {
            unregister_ll_keyboard_hook(this);
            m_InterceptedKeys.reset();  // Clear state
        }
        m_HookInstalled = need_hook;
    }
}

// Hook callback: runs on another thread!
HookInstruction on_key_down(uint32_t vk) override {
    if (auto key = intercept_key_from_vk(vk)) {
        PostMessage(m_Hwnd, WM_USER_INTERCEPT_KEY,
                   (WPARAM)*key, INTERCEPT_KEYDOWN);
        return HookInstruction::Intercept;
    }
    return HookInstruction::Propagate;
}
```

Hook callbacks run on a different thread—post messages to main thread rather than processing directly.

## ALT Key Workaround

Some apps lose focus on single ALT key press. Double-tap to restore:

```cpp
if (updated && (new_state == KeyState::Up) &&
    (vk == VK_MENU || vk == VK_LMENU || vk == VK_RMENU)) {
    write_key(buffer, vk, KeyState::Down);
    write_key(buffer, vk, KeyState::Up);
}
```

Document platform bug workarounds clearly.

## COM Resource Management

Explicit cleanup—no ARC:

```cpp
// Direct2D example
ID2D1StrokeStyle* m_StrokeStyle { nullptr };

void CreateResources() {
    HRESULT hr = m_Factory->CreateStrokeStyle(
        D2D1::StrokeStyleProperties(
            D2D1_CAP_STYLE_FLAT,
            D2D1_CAP_STYLE_FLAT,
            D2D1_CAP_STYLE_FLAT,
            D2D1_LINE_JOIN_ROUND  // Prevents visual artifacts
        ),
        nullptr, 0,
        &m_StrokeStyle
    );
}

~Renderer() {
    if (m_StrokeStyle) {
        m_StrokeStyle->Release();
        m_StrokeStyle = nullptr;
    }
}
```

## High-Resolution Timing

Use QueryPerformanceCounter for accurate timing:

```cpp
int64_t qpc_frequency() {
    static std::once_flag once;
    static int64_t freq;
    std::call_once(once, [] {
        LARGE_INTEGER li;
        if (!QueryPerformanceFrequency(&li)) std::terminate();
        freq = li.QuadPart;
    });
    return freq;
}

int64_t qpc_tick() {
    LARGE_INTEGER li;
    QueryPerformanceCounter(&li);
    return li.QuadPart;
}

int64_t tick_to_nanos(int64_t tick) {
    return (int64_t)((double)tick / (double)qpc_frequency() * 1e9);
}
```

## Cross-Platform Key Mapping

Maintain bidirectional mappings:

```cpp
static std::unordered_map<WinKey, uint16_t> windows_to_mac;
static std::array<std::optional<WinKey>, 256> mac_to_windows;

static void init() {
    std::call_once(once, [] {
        windows_to_mac[WinKey('A', false)] = 0;
        windows_to_mac[WinKey(VK_LSHIFT, false)] = 56;
        windows_to_mac[WinKey(VK_RSHIFT, false)] = 60;
        // ...

        // Build reverse mapping
        for (auto& [win, mac] : windows_to_mac) {
            if (!mac_to_windows[mac])
                mac_to_windows[mac] = win;
        }
    });
}
```

Track extended key flag for correct scan codes.

## Anti-Patterns

- Processing directly in hook callbacks instead of posting messages
- Using `GetAsyncKeyState` for toggle keys (Caps Lock)
- Forgetting to `Release()` COM objects
- Sending input without querying current state first
- Installing hooks when they're not needed

## Remember

- Always queue events for ordering guarantees
- Stack-allocate input buffers with fixed capacity
- `GetAsyncKeyState` for current state, `GetKeyState` for toggles
- Install hooks only when all conditions are met
- Document platform quirks and workarounds
- Explicit COM cleanup—no automatic reference counting
- Use QueryPerformanceCounter for high-resolution timing
