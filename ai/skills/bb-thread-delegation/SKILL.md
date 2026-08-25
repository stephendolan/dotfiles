---
name: bb-thread-delegation
description: Delegate work to bb child threads and settle them correctly. Use when spawning a child thread, deciding whether a child is stalled, stopping or archiving children, acting as a coordinator or orchestrator over other bb threads, or reporting your own outcome or blocker to a parent thread.
---

# bb thread delegation

You are responsible for every child you spawn: for starting it, for judging it
fairly, and for leaving it terminal.

## Spawn

Spawn with `--parent-self` and confirm the child's `parentThreadId` is you.

Match an existing child to its work item before spawning, so one item has one
child. Hand the child its own canonical context and let it re-read live state
itself; your summary is navigation, not authority.

## Settle

`active` means running, not stalled. A child still loading context has not
failed.

Settle a child with `bb thread wait <id> --status idle --timeout 600`. Use 600;
a shorter timeout does not make a child stalled, it just makes you wrong sooner.
Let it work: polling `thread show`, reading logs repeatedly, or sleeping in a
shell tells you nothing that `wait` does not tell you correctly.

**A child younger than 180s is never stoppable**, whatever any wait returned.
Past 180s, stop it only after a full `--timeout 600` wait has expired on it.

## Judge

Read every message a child sent you before concluding anything about it. **A
child's own report outranks your inference about it.** If it told you what it
did, that is the outcome — do not overwrite it with what you assumed from its
status.

Attribute a blocker only to a child you observed fail.

## Finish

Use `bb thread tell <id>` when requirements change or a blocker needs
clarifying. Leave every child terminal and archived.

The run is settled when each child is terminal, each outcome is recorded as the
child reported it, and your summary contradicts none of them. If you stopped a
child without a durable outcome, or a mutation you attempted failed, the run is
not settled: say so in the summary rather than reporting success.

## If you are the child

You owe your parent an honest outcome, early. Naming a blocker is the work, not
a failure to do it.

**One attempt cycle, then return.** Try the authorized path for a credential,
login, connector, or permission once. When it fails, that is your outcome:
return it with evidence and stop. A blocker you identify in the first minute and
report in the tenth cost your parent the whole ten.

Close by telling the parent what you did, what changed, the evidence ids, and
what remains. If you are stopped mid-work, your last message is the record —
make it true rather than hopeful.
