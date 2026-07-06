import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, Image, Text } from "@earendil-works/pi-tui";

// The pi-tui-dependent half of the screenshot pipeline (./screenshots.ts):
// rendering the inline frame in the transcript and in a tool result. Kept in
// its own module so the capture pipeline itself (runScreenshotPipeline) has no
// pi-tui dependency and can be imported statically — including by feed.ts's
// screenshotTick and by unit tests — without pi's TUI package on the module
// path.

export function registerScreenshotRenderer(pi: ExtensionAPI) {
  try {
    pi.registerMessageRenderer?.("tuple-screenshot", (message: any, _options: any, theme: any) => {
      try {
        const d = message?.details ?? {};
        if (!d.image) return new Text(theme.fg("muted", "No shared screen."), 0, 0);
        const c = new Container();
        const header = d.reason ? `🖥 shared screen · ${d.reason}` : "🖥 shared screen";
        c.addChild(new Text(theme.fg("dim", header), 0, 0));
        c.addChild(new Image(d.image, d.mimeType || "image/jpeg", theme, { maxWidthCells: 80, maxHeightCells: 24 }));
        return c;
      } catch {
        return new Text("shared screen", 0, 0);
      }
    });
  } catch {
    // renderer is best-effort
  }
}

export function renderScreenshotToolResult(result: any, _options: any, theme: any, _context: any) {
  try {
    const d = result?.details ?? {};
    if (!d.image) return new Text(theme.fg("muted", "No shared screen to capture."), 0, 0);
    const c = new Container();
    if (d.note) c.addChild(new Text(theme.fg("dim", `🖥 ${d.note}`), 0, 0));
    c.addChild(new Image(d.image, d.mimeType || "image/jpeg", theme, { maxWidthCells: 80, maxHeightCells: 24 }));
    return c;
  } catch {
    return new Text("screen captured", 0, 0);
  }
}
