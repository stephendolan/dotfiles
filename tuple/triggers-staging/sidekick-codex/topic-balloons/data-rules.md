# Topic Balloons Data Rules

Turn the live call into a playful memory aid, not a transcript visualization.

## What to Track

Curate at most 8 items:

- `decision`: a settled choice or direction.
- `question`: an unresolved question or ambiguity.
- `key_point`: a concept the viewer should understand later.
- `risk`: a caveat, blocker, or possible downside.
- `action`: a next step or ownership thread.
- `term`: a term of art or concept worth remembering.

Prefer concepts over phrases. Ignore filler words unless the user explicitly asks for the older repeated-word mode.

## Weights

Use `weight` as visual importance:

- `1`: mentioned once, low importance.
- `2`: useful context.
- `3`: important enough to remember.
- `4`: recurring or central.
- `5`: central decision, active open question, or demo focus.

Weights are cumulative and monotonic unless a topic is replaced by a better topic.

## Balloon Text And Pop Reveal

Every item needs:

- `label`: the short recall prompt shown directly on the balloon.
- `summary`: the extra context revealed after the user pops the balloon.
- `prompt`: optional longer/internal retrieval question for agent reasoning.

Good label: "What belongs in the trigger?"
Good summary: "The canvas template and data rules should be copied in, leaving live curation to Codex."
Weak label: "trigger template"

Clicking a balloon should pop it immediately. Do not add dialogs, buttons, modals, or confirmation UI. The reward is: pop animation first, then the context note floats out.

## Status

- `open`: show or respawn even if previously remembered.
- `changed`: show again because the meaning changed.
- omit/empty: once remembered in the browser, keep it dismissed.

## Pulse

Use `pulse` for the current thread, e.g.:

`pulse: "we're deciding what belongs in the trigger vs live agent work"`

Keep it short, playful, and useful. The current canvas template does not show a bottom help ticker; `pulse` remains useful to the agent and future variants.
