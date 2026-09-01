# Execution, critique, and polish

This playbook operationalizes the Define and Deliver stages from Anshu Chimala's
[How to turn your AI into a world-class designer](https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world).
The source advocates fresh-context critics, purposeful image and video
generation, subtraction, and removal of recognizable AI defaults. The bounded
review contract and production checklist below are this repository's adaptation.

## 1. Build the representative proof

Start with the smallest surface that exercises the direction's hardest claim:
the hero, primary workflow, key screen, or signature transition. Use real copy
and realistic content density. A concept that works only with short placeholder
text has not been proven.

Resolve these systems only as far as the proof needs them:

- layout grid, density, and responsive behavior;
- type roles, scale, measure, and hierarchy;
- palette, contrast, material, borders, and elevation;
- component geometry and state language;
- image, illustration, icon, shader, or 3D role;
- motion purpose, timing, and reduced-motion behavior;
- the signature moment and the ordinary states around it.

Inspect the rendered proof before propagating the design. If the organizing idea
is weak, return to selection; polishing a weak direction only makes it expensive.

## 2. Use media as part of the concept

Coding agents often substitute gradients, CSS shapes, and generic iconography
for purposeful imagery. Use image generation, photography, illustration, 3D,
or shaders when the design identity depends on them and the available tool can
produce a shippable result.

- Treat generated concept images as a moodboard or ingredient, not an excuse to
  copy an existing artist or product.
- Check subject accuracy, cropping, contrast with UI, compression, licensing,
  alt text, loading behavior, and fallbacks.
- Use video or keyframe interpolation for a signature transition only when it
  communicates state or creates a material part of the experience. Verify it
  frame by frame and provide a reduced-motion or static path.
- Prefer ordinary assets or code when they communicate the idea more clearly,
  load faster, or remain easier to maintain.
- Keep credentials out of prompts, source, logs, and shipped artifacts. Paid or
  externally mutating generation still requires the relevant authorization.

## 3. Run an objective critic loop

Critique the rendered artifact, not the intention or effort behind it. When a
fresh-context reviewer is available and authorized, give it only:

- screenshots or a runnable surface;
- the quality-bar card and selected direction;
- a few target-quality references labeled as baselines, not templates;
- the evaluation contract below.

Do not provide code, implementation rationale, earlier critiques, or the desired
score. Without a fresh reviewer, run the same contract as a deliberately
separate screenshot-first pass before reopening the implementation.

### Critic contract

Evaluate the artifact as a top design studio would execute this specific
direction. Judge both composition and fine detail. Return:

1. the intended aesthetic and whether it reads immediately;
2. the strongest choice worth protecting;
3. the three largest gaps, ordered by visual impact;
4. any familiar or excessive pattern that makes the result feel AI-generated;
5. specific changes that would close the gaps without changing direction;
6. a 1–5 assessment for product fit, conceptual integrity, hierarchy,
   distinctiveness, and finish.

Batch the fixes. Use no more than two substantive correction passes plus one
confirmation pass. Stop when the named gaps are closed and the proof meets the
quality bar. If the same high-level gap survives twice or a score does not move,
the loop is not converging; revise the direction or report the constraint.

## 4. Remove AI tells

Treat these as suspicion triggers, not universal bans. Keep one only when it is
conceptually justified and executed with restraint:

- purple-blue gradients, gradient text, glowing blobs, or aurora backdrops;
- centered headline, generic subhead, two CTAs, and a floating hero object;
- glass cards, excessive blur, soft shadows, or rounded containers everywhere;
- pills for ordinary labels, status chips without purpose, and icon soup;
- interchangeable three-column feature grids and equal-height section stacks;
- giant display type compensating for weak hierarchy;
- decorative grids, dots, noise, sparkles, or shaders unrelated to the product;
- fake metrics, invented testimonials, vague claims, and filler microcopy;
- every section boxed, every state animated, or every element trying to delight;
- desktop-only compositions that collapse into an arbitrary vertical stack.

Replace a trigger with product-specific structure, content, imagery, or
interaction. Avoid merely changing its color.

## 5. Subtract until the identity sharpens

For every visible element, ask whether it improves comprehension, hierarchy,
interaction, or the intended feeling. Remove redundant labels, repeated copy,
decorative containers, competing accents, and custom controls that perform
worse than native ones. Preserve breathing room that supports composition;
subtraction is not density for its own sake.

The signature moment should become stronger as supporting noise disappears. If
removing decoration erases the entire identity, the concept was decoration.

## 6. Prove production quality

Verify the states and constraints relevant to the surface:

- representative desktop, mobile, and intermediate widths;
- keyboard, pointer, touch, focus, hover, active, disabled, and selected states;
- empty, loading, error, long-content, localization, and overflow behavior;
- semantic structure, contrast, focus order, target size, screen-reader names,
  reduced motion, and zoom or text scaling;
- media loading, responsive crops, fallback states, and performance budgets;
- motion continuity, interruptibility, scroll behavior, and frame-level defects;
- existing component, token, and design-system conventions worth preserving;
- formatting, lint, type, and behavior checks appropriate to the codebase.

Finish with a concise handoff naming the selected direction, the decisive
reason, the signature moment, what was removed, visual verification performed,
and any remaining risk. Do not describe the result as world-class merely
because the process ran; report observable evidence.
