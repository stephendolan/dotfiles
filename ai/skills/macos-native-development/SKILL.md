---
name: macos-native-development
description: Modern macOS native development patterns for Swift, Objective-C++, and AppKit. Use when writing macOS app code, handling keyboard events, screen capture, or system APIs. Covers SwiftUI/AppKit integration, CGEvent handling, ScreenCaptureKit, status bar items, and platform quirks.
---

Guidance for writing robust, performant macOS native application code.

## Philosophy

macOS APIs have quirks and undocumented behaviors. Track state explicitly, document workarounds, and guard against callbacks firing after invalidation.

**Key questions before writing**:

- What thread does this run on?
- Can this API fail silently or hang?
- Does this need cleanup on deinit?
- Will this work across macOS versions?

## CGEvent vs NSEvent

Prefer CGEvent for low-level keyboard handling. NSEvent has limitations:

- Drops certain keyUp events (cmd+key combinations)
- Loses information in translation from CGEvent
- Adds conversion overhead

```swift
// CGEvent - direct access, reliable
func handleKeyEvent(_ event: CGEvent) {
    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
    let flags = event.flags
}

// NSEvent - convenience but lossy
func handleKeyEvent(_ event: NSEvent) {
    let keyCode = event.keyCode  // May differ from CGEvent
    let flags = event.modifierFlags  // May not match CGEventFlags
}
```

When migrating from NSEvent to CGEvent, do it comprehensively. Partial migrations create inconsistency.

## Event Tap Lifecycle

Event taps require careful lifecycle management. The callback may fire after invalidation due to macOS bugs:

```swift
func invalidate() {
    isInvalidated = true

    // Keep context alive to prevent use-after-free (macOS bug workaround)
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [context] in
        _ = context
    }
}

func eventTapCallback(_ event: CGEvent) -> CGEvent? {
    guard !isInvalidated else {
        Log.warning("tap event after invalidation")
        return event
    }
    // ...
}
```

## Dead Key Handling

International keyboards use dead keys for accents. Handle them explicitly:

```swift
private var deadKeyState: TKDeadKeyState?

// Quote keys (', ", `) can be dead keys in international layouts
// Forward them as normal keys, not dead keys
if isQuoteKey(event) {
    return handleAsNormalKey(event)
}
```

## Key Rollback on Focus Loss

Track pressed keys to send keyUp events when window loses focus:

```swift
private var keysPressed: [KeyboardEvent] = []

func windowDidResignKey() {
    for key in keysPressed.reversed() {  // LIFO order
        send(key.makeKeyReleaseEvent())
    }
    keysPressed.removeAll()
}
```

## Status Bar Items

Status bar items have platform-specific quirks:

```swift
// Direct drawing is more performant than NSTextField
override func draw(_ rect: CGRect) {
    let string = NSAttributedString(string: "\(count)", attributes: attributes)
    string.draw(at: position)
}

var count: Int = 0 {
    didSet { needsDisplay = true }
}
```

**macOS 26 quirk**: Status bar may not release space when closing app. Use explicit cleanup.

## ScreenCaptureKit

SCK can hang or return stale data. Use queue-based timeouts (not semaphores):

```swift
let queue = DispatchQueue(label: "sck")
var completed = false

let timeout = DispatchWorkItem { [weak self] in
    guard !completed else { return }
    self?.handleTimeout()
}
queue.asyncAfter(deadline: .now() + 5, execute: timeout)

SCShareableContent.getWithCompletionHandler { content, error in
    queue.async {
        timeout.cancel()
        completed = true
        // Process content
    }
}
```

**Why queues over semaphores**: All state mutations happen on one queue (no races), clear timeout vs success paths, no blocked threads.

Handle out-of-order responses with versioning:

```swift
private var queryVersion = 0

func query() {
    queryVersion += 1
    let expectedVersion = queryVersion

    SCShareableContent.getWithCompletionHandler { [weak self] content, _ in
        guard let self, self.queryVersion == expectedVersion else { return }
        // Process only if this is the latest query
    }
}
```

## Keyboard Layout Detection

Track layout changes to determine forwarding strategy:

```swift
var layoutsMatch: Bool {
    hostLayoutID == remoteLayoutID
}

// When layouts match: forward events directly (preserve dead keys)
// When layouts differ: translate keys (smart forwarding)
```

## Cursor Handling

Cursor rects have quirks:

```swift
// invalidateCursorRects doesn't work when window isn't key
// Workaround: Set cursor rect when window becomes key
func windowDidBecomeKey() {
    resetCursorRect()
}
```

## SwiftUI in AppKit

When embedding SwiftUI in AppKit:

```swift
let hostingView = NSHostingView(rootView: swiftUIView)

override func viewDidDisappear() {
    super.viewDidDisappear()
    ongoingTask?.cancel()
}
```

## Anti-Patterns

- Relying on AppKit to track modifier key state—track it yourself
- Using semaphores for timeout—use DispatchWorkItem cancellation
- Assuming SCK returns immediately—always timeout
- Trusting NSEvent modifierFlags to match CGEventFlags
- Destroying callback owners inside the callback

## Remember

- CGEvent over NSEvent for reliability
- Deferred destruction for event taps (macOS bug workaround)
- Track pressed keys for focus-loss rollback
- Queue-based timeouts for SCK (not semaphores)
- Version checking for out-of-order async responses
- Log when workarounds prevent crashes
