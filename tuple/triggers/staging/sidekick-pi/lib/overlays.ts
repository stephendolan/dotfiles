import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, Key, matchesKey, SelectList, Text, type SelectItem } from "@earendil-works/pi-tui";

import {
  ARTIFACT_ICON,
  ARTIFACT_LABEL,
  type Artifact,
  artifactListLabel,
  isWatchMode,
  MODE_DESC,
  MODE_LABEL,
  MODE_ORDER,
  newAutoState,
  participantNames,
} from "./console-core.ts";
import type { RuntimeState, SidekickCtx } from "./runtime.ts";
import { addWatchWord, applyMode, removeWatchWord, setAutoState } from "./runtime.ts";

export async function openWatchWords(runtime: RuntimeState, ctx: SidekickCtx) {
  if (!ctx?.hasUI) return;
  // Re-callable loop so "add"/"remove" return to the manager until dismissed.
  for (;;) {
    const items: SelectItem[] = [
      { value: "__add__", label: "➕ Add a watch word…", description: "Names Pi should notice when spoken" },
      ...runtime.state.watchWords.map((w) => ({ value: `rm:${w}`, label: `➖ ${w}`, description: "Remove this word" })),
    ];
    const choice = await selectOverlay(ctx, "Watch words", items, "↑↓ navigate • enter • esc done");
    if (!choice) return;
    if (choice === "__add__") {
      const word = await ctx.ui?.input?.("Add watch word", "e.g. copilot");
      if (word && word.trim()) addWatchWord(runtime, word);
    } else if (choice.startsWith("rm:")) {
      removeWatchWord(runtime, choice.slice(3));
    }
  }
}

export async function openCadence(runtime: RuntimeState, ctx: SidekickCtx) {
  if (!ctx?.hasUI) return;
  const autoItem: SelectItem = {
    value: "auto",
    label: `${runtime.autoState.enabled ? "● " : "  "}auto (adaptive)`,
    description: "Open in real-time, then pick the mode from the call's shape and re-evaluate as people join/leave",
  };
  const modeItems: SelectItem[] = MODE_ORDER.map((mode) => ({
    value: mode,
    // The dot marks the active mode, but only when auto isn't driving it.
    label: `${!runtime.autoState.enabled && mode === runtime.state.mode ? "● " : "  "}${MODE_LABEL[mode]}`,
    description: MODE_DESC[mode],
  }));
  const choice = await selectOverlay(ctx, "Call cadence", [autoItem, ...modeItems], "↑↓ navigate • enter select • esc cancel");
  if (!choice) return;
  if (choice === "auto") {
    enableAuto(runtime, ctx);
  } else if (isWatchMode(choice)) {
    if (runtime.autoState.enabled) setAutoState(runtime, newAutoState(false));
    applyMode(runtime, ctx, choice);
  }
}

// Turn the auto manager on: reset its timing, seed the roster so re-enabling
// doesn't fire a spurious "someone joined" pulse, and open in real-time so it
// hears how the call is going before deciding.
export function enableAuto(runtime: RuntimeState, ctx: SidekickCtx | undefined) {
  const autoState = newAutoState(true);
  autoState.prevParticipants = participantNames(runtime.feed);
  setAutoState(runtime, autoState);
  applyMode(runtime, ctx, "realtime", "auto-cadence on — listening to how the call opens, then adapting");
}

export async function openNotes(runtime: RuntimeState, ctx: SidekickCtx) {
  if (!ctx?.hasUI) return;
  if (!runtime.state.artifacts.length) {
    ctx.ui?.notify?.("No notes yet — the sidekick logs findings and fact-checks here as the call goes.", "info");
    return;
  }
  for (;;) {
    const items: SelectItem[] = runtime.state.artifacts
      .slice()
      .reverse()
      .map((a) => ({ value: String(a.id), label: artifactListLabel(a), description: `${ARTIFACT_LABEL[a.kind]}` }));
    const choice = await selectOverlay(ctx, `Notes (${runtime.state.artifacts.length})`, items, "↑↓ navigate • enter read • esc close");
    if (!choice) return;
    const artifact = runtime.state.artifacts.find((a) => String(a.id) === choice);
    if (artifact) await showArtifact(ctx, artifact);
  }
}

async function showArtifact(ctx: SidekickCtx, a: Artifact) {
  await ctx.ui?.custom?.<void>((tui: any, theme: any, _kb: any, done: (v: void) => void) => {
    const container = new Container();
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    container.addChild(new Text(theme.fg("accent", theme.bold(`${ARTIFACT_ICON[a.kind]} ${ARTIFACT_LABEL[a.kind]}: ${a.title}`)), 1, 0));
    container.addChild(new Text(theme.fg("text", a.body), 1, 1));
    container.addChild(new Text(theme.fg("dim", "esc to close"), 1, 0));
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    return {
      render: (w: number) => container.render(w),
      invalidate: () => container.invalidate(),
      handleInput: (data: string) => {
        try {
          if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter)) {
            done();
            tui.requestRender();
          }
        } catch {
          done();
        }
      },
    };
  }, { overlay: true });
}

// Shared SelectList overlay helper. Resolves to the chosen value, or null on cancel.
function selectOverlay(ctx: SidekickCtx, title: string, items: SelectItem[], help: string): Promise<string | null> {
  return ctx.ui!.custom!<string | null>((tui: any, theme: any, _kb: any, done: (v: string | null) => void) => {
    const container = new Container();
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
    const list = new SelectList(items, Math.min(items.length, 10), {
      selectedPrefix: (t: string) => theme.fg("accent", t),
      selectedText: (t: string) => theme.fg("accent", t),
      description: (t: string) => theme.fg("muted", t),
      scrollInfo: (t: string) => theme.fg("dim", t),
      noMatch: (t: string) => theme.fg("warning", t),
    });
    list.onSelect = (item: SelectItem) => done(item.value);
    list.onCancel = () => done(null);
    container.addChild(list);
    container.addChild(new Text(theme.fg("dim", help), 1, 0));
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    return {
      render: (w: number) => container.render(w),
      invalidate: () => container.invalidate(),
      handleInput: (data: string) => {
        try {
          list.handleInput(data);
          tui.requestRender();
        } catch {
          // ignore input hiccups so the overlay never crashes the TUI
        }
      },
    };
  }, { overlay: true });
}
