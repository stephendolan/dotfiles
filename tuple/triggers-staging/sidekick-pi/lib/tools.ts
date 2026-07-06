import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, Text } from "@earendil-works/pi-tui";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

import {
  ARTIFACT_ICON,
  ARTIFACT_LABEL,
  addArtifact,
  coerceArtifactKind,
  isScreenWatch,
  isWatchMode,
  MODE_DESC,
  SCREEN_WATCH_DESC,
} from "./console-core.ts";
import type { RuntimeState, SidekickCtx } from "./runtime.ts";
import { applyMode, refreshStatus, setScreenWatch } from "./runtime.ts";
import { renderScreenshotToolResult } from "./screenshot-renderer.ts";
import { runScreenshotPipeline } from "./screenshots.ts";

interface SetWatchModeParams {
  mode?: unknown;
  reason?: unknown;
}

interface SetScreenWatchParams {
  rate?: unknown;
  reason?: unknown;
}

interface SummaryParams {
  text?: unknown;
  headline?: unknown;
}

interface ArtifactParams {
  kind?: unknown;
  title?: unknown;
  body?: unknown;
}

interface CaptureScreenParams {
  note?: unknown;
}

export function registerTools(pi: ExtensionAPI, runtime: RuntimeState) {
  pi.registerTool({
    name: "set_watch_mode",
    label: "Set Watch Mode",
    description: "Adjust how aggressively the live-call companion batches transcript before sending it to you.",
    promptSnippet: "Set the live-call watch pace to realtime, balanced, low_noise, or periodic.",
    promptGuidelines: [
      "Use set_watch_mode when the call's shape changes enough to warrant a faster or less chatty pace (e.g. a long presentation → periodic); don't call it every batch.",
      "This is also how you answer an '[auto-cadence]' check: pick the mode that fits and call this once.",
      "Do NOT call this on connect or before you've heard any speech — the pace is already set at launch and an auto-cadence manager asks you to evaluate once the call has shape. Configuring dials with no evidence is noise.",
    ],
    parameters: Type.Object({
      mode: StringEnum(["realtime", "balanced", "low_noise", "periodic"] as const, { description: "How quickly to deliver future transcript batches" }),
      reason: Type.Optional(Type.String({ description: "Why this pace fits the current call" })),
    }),
    async execute(_id: unknown, params: SetWatchModeParams, _signal: unknown, _onUpdate: unknown, ctx: SidekickCtx) {
      const mode = String(params?.mode ?? "").trim().toLowerCase().replace(/-/g, "_");
      if (!isWatchMode(mode)) throw new Error("mode must be one of: realtime, balanced, low_noise, periodic");
      const reason = typeof params?.reason === "string" && params.reason.trim() ? params.reason.trim() : undefined;
      applyMode(runtime, ctx, mode, reason);
      return { content: [{ type: "text", text: `Watch mode set to ${mode} (${MODE_DESC[mode]}); applies from the next batch.${reason ? ` Reason: ${reason}` : ""}` }] };
    },
  });

  pi.registerTool({
    name: "set_screen_watch",
    label: "Set Screen Watch",
    description: "Control how closely the sidekick auto-captures the shared screen. Separate from the transcript watch mode — you can follow a demo frame-by-frame while barely sampling the talk.",
    promptSnippet: "Set screen watch to off, periodic, or active (frames every few seconds, fed to your vision).",
    promptGuidelines: [
      "Set 'active' when someone is demoing or the screen is the point and you need to follow it — you'll then receive a frame every few seconds in your context. Set it back to 'periodic' or 'off' when the demo ends, so you stop pulling frames.",
      "This is independent of set_watch_mode; changing one doesn't change the other. It only matters while someone is sharing.",
      "Do NOT call this while no one is sharing — the axis is idle, a fresh share is always captured immediately regardless of level, and you'll be asked to re-evaluate the moment one starts. Never set it 'as a default' on connect.",
    ],
    parameters: Type.Object({
      rate: StringEnum(["off", "periodic", "active"] as const, { description: "How closely to capture the shared screen" }),
      reason: Type.Optional(Type.String({ description: "Why this level fits what's on screen" })),
    }),
    async execute(_id: unknown, params: SetScreenWatchParams, _signal: unknown, _onUpdate: unknown, ctx: SidekickCtx) {
      const rate = String(params?.rate ?? "").trim().toLowerCase();
      if (!isScreenWatch(rate)) throw new Error("rate must be one of: off, periodic, active");
      const reason = typeof params?.reason === "string" && params.reason.trim() ? params.reason.trim() : undefined;
      setScreenWatch(runtime, rate);
      try {
        if (ctx?.hasUI) ctx.ui?.notify?.(`Screen watch: ${rate} — ${reason ?? SCREEN_WATCH_DESC[rate]}`, "info");
      } catch {
        // notify is best-effort
      }
      return { content: [{ type: "text", text: `Screen watch set to ${rate} (${SCREEN_WATCH_DESC[rate]}).${reason ? ` Reason: ${reason}` : ""}` }] };
    },
  });

  pi.registerTool({
    name: "post_summary",
    label: "Post Call Summary",
    description: "Surface a short topic summary of the live call. Renders in a separate muted 'call' style so it doesn't bury the person's direct conversation with you. Use on topic shifts or every few minutes — not every batch.",
    promptSnippet: "Post a one- or two-line summary of what the call just covered.",
    promptGuidelines: [
      "Call post_summary when the call's topic meaningfully shifts, or periodically on a long call — keep it to a line or two.",
      "Do not use it for routine chatter; stay silent when nothing has changed.",
    ],
    parameters: Type.Object({
      text: Type.String({ description: "The one- or two-line topic summary" }),
      headline: Type.Optional(Type.String({ description: "Optional 2-4 word topic label" })),
    }),
    async execute(_id: unknown, params: SummaryParams) {
      const text = String(params?.text ?? "").trim();
      if (!text) throw new Error("text is required");
      const headline = typeof params?.headline === "string" && params.headline.trim() ? params.headline.trim() : undefined;
      runtime.state.lastSummaryMs = Date.now();
      refreshStatus(runtime);
      return { content: [{ type: "text", text: headline ? `${headline}: ${text}` : text }], details: { kind: "summary", headline, text } };
    },
    renderResult(result: any, _options: any, theme: any, _context: any) {
      try {
        const d = result?.details ?? {};
        const gutter = (s: string) => theme.fg("dim", "▏") + " " + s;
        const lines: string[] = [];
        if (d.headline) lines.push(gutter(theme.fg("muted", theme.bold(`call · ${d.headline}`))));
        else lines.push(gutter(theme.fg("muted", "call summary")));
        for (const ln of String(d.text ?? "").split("\n")) lines.push(gutter(theme.fg("muted", ln)));
        const c = new Container();
        for (const ln of lines) c.addChild(new Text(ln, 0, 0));
        return c;
      } catch {
        return new Text(String(result?.details?.text ?? "call summary"), 0, 0);
      }
    },
  });

  pi.registerTool({
    name: "record_artifact",
    label: "Record Artifact",
    description: "Record a finding, fact-check, or note from the call. Renders as a distinct card and is collected in the /notes browser.",
    promptSnippet: "Record a finding, fact-check, or note worth keeping from the call.",
    promptGuidelines: [
      "Use record_artifact when you verify a claim, catch an error, or learn something worth keeping — not for routine summaries (use post_summary for those).",
    ],
    parameters: Type.Object({
      kind: StringEnum(["finding", "fact_check", "note"] as const, { description: "What kind of artifact this is" }),
      title: Type.String({ description: "A short title" }),
      body: Type.String({ description: "The finding, fact-check result, or note body" }),
    }),
    async execute(_id: unknown, params: ArtifactParams) {
      const kind = coerceArtifactKind(params?.kind);
      const title = String(params?.title ?? "").trim();
      const body = String(params?.body ?? "").trim();
      if (!title || !body) throw new Error("title and body are required");
      const res = addArtifact(runtime.state.artifacts, { kind, title, body, atMs: Date.now() });
      runtime.state.artifacts = res.list;
      refreshStatus(runtime);
      try {
        pi.appendEntry?.("tuple-artifact", res.artifact);
      } catch {
        // persistence is best-effort
      }
      const verb = res.added ? "Recorded" : "Already recorded";
      return { content: [{ type: "text", text: `${verb} ${ARTIFACT_LABEL[kind].toLowerCase()}: ${title}` }], details: { artifact: res.artifact } };
    },
    renderResult(result: any, _options: any, theme: any, _context: any) {
      try {
        const a = result?.details?.artifact;
        const c = new Container();
        c.addChild(new DynamicBorder((s: string) => theme.fg("border", s)));
        if (a) {
          c.addChild(new Text(theme.fg("accent", theme.bold(`${ARTIFACT_ICON[a.kind]} ${ARTIFACT_LABEL[a.kind]}: ${a.title}`)), 1, 0));
          c.addChild(new Text(theme.fg("text", a.body), 1, 0));
        } else {
          c.addChild(new Text(theme.fg("muted", "artifact recorded"), 1, 0));
        }
        c.addChild(new DynamicBorder((s: string) => theme.fg("border", s)));
        return c;
      } catch {
        return new Text(String(result?.details?.artifact?.title ?? "artifact recorded"), 0, 0);
      }
    },
  });

  pi.registerTool({
    name: "capture_screen",
    label: "Capture Shared Screen",
    description: "Capture the currently shared screen on the Tuple call and show it inline. Use when the shared screen matters — a demo, a diagram, an error message, a slide.",
    promptSnippet: "Capture and show what's on the shared screen right now.",
    promptGuidelines: [
      "Call capture_screen when the visual on the shared screen is what matters (a demo, diagram, or on-screen error) — not for routine speech.",
    ],
    parameters: Type.Object({
      note: Type.Optional(Type.String({ description: "Optional caption for why this screen matters" })),
    }),
    async execute(_id: unknown, params: CaptureScreenParams, _signal: unknown, _onUpdate: unknown, ctx: SidekickCtx) {
      const note = typeof params?.note === "string" && params.note.trim() ? params.note.trim() : undefined;
      const result = await runScreenshotPipeline(pi, runtime, ctx, { note, feedModel: true });
      return result.toolResult;
    },
    renderResult: renderScreenshotToolResult,
  });
}
