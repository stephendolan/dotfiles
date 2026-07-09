import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { RuntimeState, SidekickCtx } from "./runtime.ts";

export async function claimSidekickLock(runtime: RuntimeState, ctx: SidekickCtx | undefined): Promise<boolean> {
  try {
    const dir = join(tmpdir(), "tuple-pi-sidekick", "locks");
    await mkdir(dir, { recursive: true });
    const key = lockKey(runtime);
    const path = join(dir, `${key}.pid`);
    const prior = await readPid(path);
    if (prior && prior !== process.pid && pidAlive(prior)) {
      runtime.lockPath = null;
      try {
        ctx?.ui?.notify?.("Another Call Console is already following this call.", "warning");
      } catch {
        // notify is best-effort
      }
      return false;
    }
    await writeFile(path, String(process.pid), "utf8");
    runtime.lockPath = path;
    return true;
  } catch {
    return false;
  }
}

export async function releaseSidekickLock(runtime: RuntimeState) {
  if (!runtime.lockPath) return;
  const path = runtime.lockPath;
  runtime.lockPath = null;
  try {
    const prior = await readPid(path);
    if (prior === process.pid) await rm(path, { force: true });
  } catch {
    // lock cleanup is best-effort
  }
}

function lockKey(runtime: RuntimeState): string {
  const artifactDir = process.env.TUPLE_TRIGGER_CALL_ARTIFACTS_DIRECTORY?.trim();
  const base = artifactDir || `${runtime.cli}:${process.env.USER || "unknown"}`;
  return base.replace(/[^a-zA-Z0-9_.-]+/g, "_").slice(0, 120) || "default";
}

async function readPid(path: string): Promise<number | null> {
  try {
    const raw = await readFile(path, "utf8");
    const pid = Number(raw.trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
