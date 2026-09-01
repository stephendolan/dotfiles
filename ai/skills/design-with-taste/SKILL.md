---
name: design-with-taste
description: Generate, select, and refine distinctive visual directions for new interfaces, redesigns, landing pages, prototypes, or bland AI-generated UI.
metadata:
  source-author: Anshu Chimala
  source-title: How to turn your AI into a world-class designer
  source-url: https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world
  adaptation: Original agent workflow based on the credited source
---

# Design With Taste

Create a coherent point of view instead of averaging familiar design patterns.
This skill owns creative search, autonomous direction selection, and visual
quality control. Product truth, user intent, and established brand constraints
still win.

## Provenance

The Discover, Define, and Deliver frame and its seed, ambition, critic, media,
and subtraction techniques are adapted from Anshu Chimala's
[How to turn your AI into a world-class designer](https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world),
published by Lenny's Newsletter. The autonomous selection method, production
checks, and agent-facing structure are this repository's adaptation. Preserve
that attribution when reusing or publishing this skill.

## Load the relevant playbook

- For open-ended ideation, competing visual directions, or autonomous concept
  selection, read [ideation-and-selection.md](references/ideation-and-selection.md).
- For implementing, critiquing, or polishing a selected direction, read
  [execution-and-critique.md](references/execution-and-critique.md).
- For an end-to-end design task, read both in that order.

## Workflow

1. **Ground.** Inspect the product goal, audience, real content, platform,
   incumbent visual truth, and implementation constraints. Establish what the
   interface must help the user feel, understand, and do. Finish when the
   non-negotiables and the visual freedom are explicit.
2. **Discover.** Explore genuinely different concepts before writing the full
   implementation. Use independent stimuli, product-specific metaphors, and
   deliberate rule-breaking to escape the model's default distribution.
3. **Select.** Gate candidates against the non-negotiables, compare the
   survivors pairwise, and choose one direction. Proceed with the strongest
   reversible choice; do not hand the user an unranked menu unless they asked
   for one. Generate another batch when no candidate clears the quality bar.
4. **Define.** Turn the winner into an executable design identity: composition,
   typography, palette, material, imagery, interaction, motion, signature
   moment, and explicit anti-goals. Every choice should reinforce the same
   feeling and product story.
5. **Build.** Prove the identity in the smallest representative surface, inspect
   it visually, then extend it. Use the project's existing stack and reusable
   components. Generate imagery or motion only when it materially strengthens
   the chosen direction.
6. **Critique.** Judge rendered output against the brief and strong visual
   references. When independent review is authorized, use a fresh context that
   does not see implementation effort or rationale. Make bounded, batched
   corrections; revisit the direction when iterations are not converging.
7. **Deliver.** Remove weak or redundant elements, replace unjustified AI
   defaults, and verify responsive states, interaction states, accessibility,
   performance, and production behavior.

## Autonomy

- Choose and implement the best reversible direction when the user delegates
  the design decision. State the choice and its decisive reason; keep moving.
- Ask before a direction changes product meaning, brand positioning, factual
  claims, accessibility obligations, paid services, or other consequential
  constraints.
- Use seeded variation only where several answers can be valid. Never let
  randomness decide facts, correctness, permissions, or user requirements.
- If the request is for ideas rather than implementation, stop after the chosen
  direction, runner-up, and concise rationale are clear.

## Completion criteria

The work is complete when one direction has a recognizable identity tied to
the product, its signature moment is present, its major visual choices are
coherent, generic AI patterns have been removed or justified, and the relevant
rendered states have passed the checks for the requested scope.
