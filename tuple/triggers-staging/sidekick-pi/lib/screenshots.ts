import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, Image, Text } from "@earendil-works/pi-tui";

import type { RuntimeState, SidekickCtx } from "./runtime.ts";
import { captureSharedScreen } from "./runtime.ts";

export interface ScreenshotOptions {
  feedModel?: boolean;
  reason?: string;
  note?: string;
  notify?: boolean;
  guard?: boolean;
}

export interface ScreenshotResult {
  captured: boolean;
  toolResult: {
    content: { type: "text"; text: string }[];
    details: { image: string | null; mimeType?: string; note?: string; reason?: string };
  };
}

// One capture pipeline for proactive frames, the model tool, and /screenshot:
// capture JPEG from Tuple, convert only the display copy to PNG, then decide how
// to send/render without changing each caller's public behavior.
export async function runScreenshotPipeline(
  pi: ExtensionAPI,
  runtime: RuntimeState,
  ctx: SidekickCtx | undefined,
  options: ScreenshotOptions = {},
): Promise<ScreenshotResult> {
  if (options.guard && runtime.capturing) {
    return { captured: false, toolResult: { content: [{ type: "text", text: "Screen capture already in progress." }], details: { image: null } } };
  }
  if (options.guard) runtime.capturing = true;
  try {
    if (options.notify && ctx?.hasUI) ctx.ui?.notify?.("Capturing the shared screen…", "info");
    const capture = await captureSharedScreen(runtime);
    if (!capture) {
      if (options.notify && ctx?.hasUI) ctx.ui?.notify?.("No shared screen to capture right now.", "warning");
      return {
        captured: false,
        toolResult: { content: [{ type: "text", text: "No shared screen to capture right now (or capture failed)." }], details: { image: null } },
      };
    }

    const details = { ...capture.display, note: options.note, reason: options.reason };
    const imageReason = options.reason || options.note || "requested";
    if (options.feedModel) {
      pi.sendMessage(
        {
          customType: "tuple-screenshot",
          content: [
            { type: "text", text: `Shared screen (${imageReason})` },
            { type: "image", data: capture.jpegB64, mimeType: "image/jpeg" },
          ],
          display: true,
          details,
        } as any,
        {},
      );
    } else if (options.reason) {
      pi.sendMessage(
        { customType: "tuple-screenshot", content: `Shared screen (${options.reason})`, display: true, details } as any,
        {},
      );
    } else if (options.notify) {
      pi.sendMessage({ customType: "tuple-screenshot", content: "Shared screen", display: true, details } as any, {});
    }

    return {
      captured: true,
      toolResult: {
        content: [{
          type: "text",
          text: options.feedModel
            ? (options.note
              ? `Captured the shared screen — ${options.note}. Shown to the user below; the frame will arrive in your context.`
              : "Captured the shared screen. Shown to the user below; the frame will arrive in your context.")
            : (options.note ? `Captured the shared screen — ${options.note}. Shown to the user below.` : "Captured the shared screen. Shown to the user below."),
        }],
        details,
      },
    };
  } catch {
    if (options.notify && ctx?.hasUI) ctx.ui?.notify?.("Screen capture failed.", "error");
    return { captured: false, toolResult: { content: [{ type: "text", text: "Screen capture failed." }], details: { image: null } } };
  } finally {
    if (options.guard) runtime.capturing = false;
  }
}

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
