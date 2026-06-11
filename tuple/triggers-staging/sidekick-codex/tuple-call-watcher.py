#!/usr/bin/env python3
"""
Tuple call companion watcher -- known-good, deterministic.

Usage:  ./tuple-call-watcher.py [--catchup | --exit-on-batch] [--max-wait SECS] [--offsets TAG] [call-id] [transcripts-root]
        (it's executable; equivalently `python3 tuple-call-watcher.py ...`)
  --catchup          one-shot: ignore any saved offset, read every file from the
                     start, print that backlog, save offsets, and exit. The
                     first run of a session -- so a relaunch always re-catches-up.
  --exit-on-batch    gather records for ~1s, flush one batch, then exit (instead
                     of running continuously). For agents with no event-driven
                     wake (Codex): run it, handle the batch, re-run it. Without
                     either flag the watcher runs continuously (Claude + Monitor),
                     forwarding each poll's new records immediately and letting
                     Monitor re-wake the agent.
  --max-wait SECS    only with --exit-on-batch: if no records arrive within SECS
                     seconds, exit anyway with an empty batch, handing control
                     back to the caller. Without it --exit-on-batch blocks until
                     the next record -- which never comes in a silent room, so a
                     poll-loop caller that does periodic work (e.g. a coach's
                     silence checks) needs this to get a turn during silence.
  --offsets TAG      suffix for the per-session offset file
                     (.tuple-watcher-offsets-TAG), so two agents watching the same
                     call keep separate read positions.
  call-id            usually omitted -- inferred from the session dir this script
                     sits in. Pass it only to override.
  transcripts-root   usually omitted -- inferred as the parent of that session dir.

The script is dropped inside its call's recording-session dir
(<root>/<timestamp>@<call-id>/), next to events.jsonl / transcriptions.jsonl, so
it locates both the transcripts root and the call-id from its own path -- nothing
needs to be passed in.

Emits each new transcripts/events record as a tagged line:
  T|<session-dir>|<json>   a transcriptions.jsonl record
  E|<session-dir>|<json>   an events.jsonl record

A run reads each file forward from its saved offset (a fresh file from the start,
so its backlog becomes the opening batch), emits the new records, and saves the
new offset -- so the next run, in either mode, resumes with no gap or repeat.
"""
import glob, os, sys, time

exit_on_batch = False
from_start = False
offsets_tag = None
max_wait = None
positional = []
_args = list(sys.argv[1:])
_i = 0
while _i < len(_args):
    a = _args[_i]
    if a == "--exit-on-batch":
        exit_on_batch = True
    elif a == "--catchup":
        exit_on_batch = True   # one-shot: print the backlog and exit
        from_start = True      # ignore any saved offset; read every file from 0
    elif a == "--offsets":
        _i += 1
        if _i >= len(_args) or _args[_i].startswith("--"):
            sys.stderr.write("tuple-watcher: --offsets needs a tag value\n")
            sys.exit(2)
        offsets_tag = _args[_i]
    elif a == "--max-wait":
        _i += 1
        if _i >= len(_args) or _args[_i].startswith("--"):
            sys.stderr.write("tuple-watcher: --max-wait needs a seconds value\n")
            sys.exit(2)
        try:
            max_wait = float(_args[_i])
        except ValueError:
            sys.stderr.write("tuple-watcher: --max-wait needs a numeric seconds value\n")
            sys.exit(2)
    else:
        positional.append(a)
    _i += 1

# Locate everything from this script's own home: it's dropped inside its call's
# <timestamp>@<call-id> session dir. Positional args override (call-id, root).
HERE = os.path.dirname(os.path.realpath(__file__))
CALL_ID = positional[0] if len(positional) > 0 else os.path.basename(HERE).split("@", 1)[-1]
ROOT = positional[1] if len(positional) > 1 else os.path.dirname(HERE)
PAT = os.path.join(ROOT, "*@" + CALL_ID, "*.jsonl")
# Per-agent offset file: --offsets keeps two agents watching the same call from
# clobbering each other's read positions.
STATE_NAME = ".tuple-watcher-offsets" + ("-" + offsets_tag if offsets_tag else "")

QUIET_FLUSH = 1      # --exit-on-batch: seconds to gather before flushing+exiting
MAX_FLUSH = 8        # --exit-on-batch: hard cap during continuous speech

# events.jsonl mute/unmute noise: user_audio_started/stopped fire when a
# participant unmutes/mutes. The sidekick never logs them, so drop them at the
# source instead of emitting records the agent only discards.
SKIP_EVENTS = ('"user_audio_started"', '"user_audio_stopped"')


def warn(msg):
    # stderr stays out of the agent's stdout parsing but is visible to the human
    # in Terminal (and in BetterStack), so a swallowed failure isn't invisible.
    sys.stderr.write("tuple-watcher: " + msg + "\n")


def session_dirs():
    return [d for d in glob.glob(os.path.join(ROOT, "*@" + CALL_ID)) if os.path.isdir(d)]


def files():
    return sorted(glob.glob(PAT))


def load_state():
    """Per-session offset files: each <session-dir>/.tuple-watcher-offsets
    holds 'basename<TAB>offset' for that dir's own files. Returns a map keyed
    by full file path."""
    off = {}
    for d in session_dirs():
        try:
            with open(os.path.join(d, STATE_NAME), "r") as fh:
                for line in fh:
                    line = line.rstrip("\n")
                    if not line:
                        continue
                    tab = line.rfind("\t")  # basename has no tab
                    if tab < 0:
                        continue
                    try:
                        off[os.path.join(d, line[:tab])] = int(line[tab + 1:])
                    except ValueError:
                        continue
        except FileNotFoundError:
            pass  # no state file yet for this dir/tag -- first run
        except OSError as e:
            warn("could not read offsets in %s: %s" % (d, e))
    return off


def save_state(off):
    """Write one .tuple-watcher-offsets per session dir, holding that dir's
    own files' offsets (basename<TAB>offset)."""
    by_dir = {}
    for path, n in off.items():
        by_dir.setdefault(os.path.dirname(path), {})[os.path.basename(path)] = n
    for d, entries in by_dir.items():
        try:
            tmp = os.path.join(d, STATE_NAME + ".tmp")
            with open(tmp, "w") as fh:
                for name, n in entries.items():
                    fh.write(name + "\t" + str(n) + "\n")
            os.replace(tmp, os.path.join(d, STATE_NAME))
        except OSError as e:
            # Never silent: a dropped offset write is what makes a run replay the
            # whole backlog (the read-only-sandbox bug this watcher exists to fix).
            warn("could not persist offsets in %s: %s" % (d, e))


# Offset map keyed by full file path. Resumed from the per-session state file so a
# run continues where the last left off; --catchup ignores it and reads every file
# from 0 (full backlog) so a relaunch re-catches-up regardless of stale offsets.
# Both modes persist on each flush. Claude runs one --catchup read (via Bash, no
# Monitor size cap) then a continuous Monitor run that resumes from the same
# --offsets file; Codex runs --catchup once then loops --exit-on-batch.
off = {} if from_start else load_state()

buf = []
first_ts = last_ts = 0.0
have = False
# True until the first flush when we start with no offsets (the opening batch is
# the backlog) -- flush it the instant there's data, no gather, in either mode.
catchup = not off


def collect():
    """Append new records to buf; return True if anything new was read."""
    newdata = False
    for f in files():
        try:
            cur = os.path.getsize(f)
        except FileNotFoundError:
            continue  # disappeared between glob and stat
        except OSError as e:
            warn("could not stat %s: %s" % (f, e))
            continue
        prev = off.get(f, 0)  # new session dirs start at 0 -> fully captured
        if cur > prev:
            tag = "E" if f.endswith("events.jsonl") else "T"
            # Read bytes (not text): offsets are byte positions, and decoding the
            # whole read in text mode would crash on a half-written multibyte char
            # (a ValueError, not OSError). Decode per line with errors="replace".
            try:
                with open(f, "rb") as fh:
                    fh.seek(prev)
                    chunk = fh.read()
            except FileNotFoundError:
                continue
            except OSError as e:
                warn("could not read %s: %s" % (f, e))
                continue
            # Only consume up to the last newline so a half-written line isn't
            # emitted as broken JSON; the remainder is read next tick. Advance
            # the offset by bytes actually consumed, not the full file size.
            cut = chunk.rfind(b"\n")
            if cut < 0:
                continue  # no complete line yet
            complete = chunk[: cut + 1]
            off[f] = prev + len(complete)
            sess = os.path.basename(os.path.dirname(f))
            for raw in complete.split(b"\n"):
                text = raw.decode("utf-8", "replace").strip()
                if not text:
                    continue
                if tag == "E" and any(s in text for s in SKIP_EVENTS):
                    continue  # mute/unmute noise; offset still advances above
                buf.append(tag + "|" + sess + "|" + text)
                newdata = True
        elif cur < prev:
            # Tuple's recorder only ever appends to these files, so a shrink means
            # something is wrong (file rotated, replaced, or the wrong one) --
            # surface it rather than pretending it's normal, and re-baseline.
            warn("%s shrank to %d bytes (was %d); these recording files only grow" % (f, cur, prev))
            off[f] = cur
    return newdata


def flush():
    if not buf:
        return
    try:
        sys.stdout.write("\n".join(buf) + "\n")
        sys.stdout.flush()
    except BrokenPipeError:
        sys.exit(0)  # Monitor/Bash closed the pipe -- stop cleanly, no traceback


if from_start:
    # --catchup: one pass over the whole backlog, then exit. Don't loop waiting
    # for data -- a launch before the first complete line is written would block
    # forever; the live run resumes from the offset we save here.
    collect()
    flush()
    save_state(off)
    sys.exit(0)


# --max-wait deadline (only with --exit-on-batch): after this much wall-clock
# with no flush, exit anyway so a poll-loop caller regains its turn during a
# silent stretch. Reset on each flushed batch isn't needed -- exit-on-batch exits
# on flush, so this loop only runs once per invocation.
wait_deadline = (time.time() + max_wait) if (exit_on_batch and max_wait is not None) else None

while True:
    newdata = collect()

    now = time.time()
    if newdata:
        if not have:
            first_ts = now
            have = True
        last_ts = now

    # Continuous mode forwards each poll's records immediately (whisper already
    # emits a line at a time; smaller, more frequent notifications also dodge the
    # consumer's size cap). --exit-on-batch gathers for QUIET_FLUSH first to cut
    # the cost of re-invoking the script, except on the catch-up batch.
    if have and (not exit_on_batch or catchup
                 or now - last_ts >= QUIET_FLUSH or now - first_ts >= MAX_FLUSH):
        flush()
        save_state(off)
        if exit_on_batch:
            sys.exit(0)
        buf = []
        have = False
        catchup = False

    # Silence past --max-wait: hand control back with whatever we have (usually an
    # empty batch -- flush() no-ops on an empty buffer). Lets a Monitor-less caller
    # run its periodic work instead of blocking here until the next record.
    if wait_deadline is not None and not have and now >= wait_deadline:
        save_state(off)
        sys.exit(0)

    time.sleep(1)

