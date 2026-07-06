import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { RuntimeState, SidekickCtx } from "./runtime.ts";
import { captureSharedScreen } from "./runtime.ts";

// Deliberately free of any pi-tui import — see ./screenshot-renderer.ts for the
// rendering half (registerScreenshotRenderer / renderScreenshotToolResult).
// Keeping this pipeline pi-tui-free means it (and anything that imports it
// statically, like feed.ts's screenshotTick) stays loadable and unit-testable
// without pi's TUI package on the module path.

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
