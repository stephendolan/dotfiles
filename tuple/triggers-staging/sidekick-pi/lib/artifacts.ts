import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { buildArtifactsMarkdown, participantNames } from "./console-core.ts";
import type { RuntimeState, SidekickCtx } from "./runtime.ts";

export async function exportArtifacts(pi: ExtensionAPI, runtime: RuntimeState, ctx: SidekickCtx | undefined, nowMs = Date.now()) {
  if (!runtime.config.exportNotes || runtime.notesExported || runtime.state.artifacts.length === 0) return;
  try {
    const dir = await resolveArtifactsDirectory();
    await mkdir(dir, { recursive: true });
    const file = join(dir, "sidekick-notes.md");
    const sessionName = runtime.lastSessionName || "Tuple call notes";
    const markdown = buildArtifactsMarkdown({
      artifacts: runtime.state.artifacts,
      callStartMs: runtime.state.callStartMs,
      participants: participantNames(runtime.feed),
      sessionName,
      generatedAtMs: nowMs,
    });
    await writeFile(file, markdown, "utf8");
    runtime.notesExported = true;
    try {
      ctx?.ui?.notify?.(`Sidekick notes written to ${file}`, "info");
    } catch {
      // notify is best-effort
    }
    pi.sendMessage(
      { customType: "tuple-artifact-export", content: `Sidekick notes written to ${file}`, display: true },
      {},
    );
  } catch {
    // Export is best-effort; artifacts remain browsable in /notes.
  }
}

async function resolveArtifactsDirectory(): Promise<string> {
  const envDir = process.env.TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY?.trim();
  if (envDir) return envDir;

  const callsDir = join(homedir(), "Documents", "Tuple Calls");
  try {
    const entries = await readdir(callsDir, { withFileTypes: true });
    const datedDirs = [];
    for (const e of entries) {
      if (!e.isDirectory() || !/^\d{4}[-_]\d{2}[-_]\d{2}/.test(e.name)) continue;
      const full = join(callsDir, e.name);
      const s = await stat(full);
      datedDirs.push({ path: full, mtimeMs: s.mtimeMs });
    }
    datedDirs.sort((a, b) => b.mtimeMs - a.mtimeMs);
    if (datedDirs[0]) return datedDirs[0].path;
  } catch {
    // fall back below
  }
  return process.cwd();
}
