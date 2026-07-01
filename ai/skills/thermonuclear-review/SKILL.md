---
name: thermonuclear-review
description: Run an extremely strict maintainability review for abstraction quality, giant files, and spaghetti-condition growth. Use for a thermo-nuclear code quality review, thermonuclear review, deep code quality audit, or especially harsh maintainability review.
model: opus
---

# Thermonuclear Code Quality Review

Use this skill for an unusually strict review focused on implementation quality, maintainability, abstraction quality, and codebase health.

Above all, push the reviewer to be **ambitious** about code structure. Do not merely identify local cleanup opportunities. Actively search for "code judo" moves: restructurings that preserve behavior while making the implementation dramatically simpler, smaller, more direct, and more elegant.

## Core Prompt

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce Spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.

## Standards

Apply the baseline above, plus these explicit review rules. Each names the smell to flag and the remedy to prefer.

0. **Be ambitious about structural simplification.** Don't stop at "this could be a bit cleaner." Look for reframings that make whole branches, helpers, modes, conditionals, or layers disappear entirely — assume a "code judo" move is often available that uses the existing architecture more effectively. Prefer deleting complexity over rearranging it, and prefer the solution that makes the code feel inevitable in hindsight. Flag refactors that move code around but fail to reduce the number of concepts a reader must hold in their head.

1. **Do not let a PR push a file from under 1k lines to over 1k lines without a very strong reason.** Treat this as a strong code-quality smell by default. Prefer extracting helpers, subcomponents, modules, or local abstractions instead of letting a file sprawl past 1000 lines. If the diff crosses that threshold, explicitly ask whether the code should be decomposed first. Only waive this if there is a compelling structural reason and the resulting file is still clearly organized.

2. **Do not allow random spaghetti growth in existing code.** Be highly suspicious of new ad-hoc conditionals, scattered special cases, or one-off branches bolted into unrelated flows. Treat "weird if statements in random places" as a design problem, not a stylistic nit. Prefer pushing logic into a dedicated abstraction, helper, state machine, policy object, or separate module instead of tangling an existing path. Call out changes that make surrounding code harder to reason about, even if they technically work.

3. **Bias toward cleaning the design, not just accepting working code.** If behavior can stay the same while the structure becomes meaningfully cleaner, push for the cleaner version. Do not rubber-stamp "it works" implementations that leave the codebase messier. Strongly prefer simplifications that remove moving pieces altogether over refactors that merely spread the same complexity around.

4. **Prefer direct, boring, maintainable code over hacky or magical code.** Treat brittle, ad-hoc, or "magic" behavior as a code-quality problem. Be skeptical of generic mechanisms that hide simple data-shape assumptions. Flag thin wrappers, identity abstractions, or pass-through helpers that add indirection without buying clarity, and prefer keeping the direct flow.

5. **Push hard on type and boundary cleanliness when they affect maintainability.** Question unnecessary optionality, `unknown`, `any`, or cast-heavy code when a clearer type boundary could exist. Prefer explicit typed models or shared contracts over loosely-shaped ad-hoc objects. If a branch relies on silent fallback to paper over an unclear invariant, ask whether the boundary should be made explicit instead — explicit types often make the control flow simpler.

6. **Keep logic in the canonical layer and reuse existing helpers.** Call out feature logic leaking into shared paths or implementation details leaking through APIs. Prefer existing canonical utilities/helpers over bespoke near-duplicates. Push code toward the right package, service, or module instead of normalizing architectural drift.

7. **Treat unnecessary sequential orchestration and non-atomic updates as design smells when the cleaner structure is obvious.** If independent work is serialized for no good reason, ask whether the flow should run in parallel instead. If related updates can leave state half-applied, push for a more atomic structure. Don't over-index on micro-optimizations, but do flag avoidable orchestration complexity that makes the implementation more brittle.

Do not be satisfied with "maybe rename this" feedback when the real issue is structural, or with a merely cleaner version of the same messy idea when there is a plausible path to a much simpler one. Do not approve merely because behavior seems correct: treat a visible-but-untaken code-judo move, an unjustified file-size explosion, ad-hoc spaghetti branching, a hacky/magical abstraction, unnecessary wrapper/cast/optionality churn, and canonical-helper duplication or wrong-layer logic as presumptive blockers unless the author justifies them clearly.

## Review Tone

Be direct, serious, and demanding about quality. Do not be rude, but do not soften major maintainability issues into mild suggestions. If the code is making the codebase messier, say so clearly. If the implementation missed an opportunity for a dramatic simplification, say that clearly too.

Good phrases:

- `this pushes the file past 1k lines. can we decompose this first?`
- `this adds another special-case branch into an already busy flow. can we move this behind its own abstraction?`
- `this works, but it makes the surrounding code more spaghetti. let's keep the behavior and restructure the implementation.`
- `this feels like feature logic leaking into a shared path. can we isolate it?`
- `this abstraction seems unnecessary. can we just keep the direct flow?`
- `why does this need a cast / optional here? can we make the boundary more explicit instead?`
- `this looks like a bespoke helper for something we already have elsewhere. can we reuse the canonical one?`
- `i think there's a code-judo move here that makes this much simpler. can we reframe this so these branches disappear?`
- `this refactor moves complexity around, but doesn't really delete it. is there a way to make the model itself simpler?`

## Output Expectations

Prioritize findings in this order:

1. Structural code-quality regressions
2. Missed opportunities for dramatic simplification / code-judo restructuring
3. Spaghetti / branching complexity increases
4. Boundary / abstraction / type-contract problems that make the code harder to reason about
5. File-size and decomposition concerns
6. Modularity and abstraction issues
7. Legibility and maintainability concerns

Do not flood the review with low-value nits if there are larger structural issues. Prefer a smaller number of high-conviction comments over a long list of cosmetic notes.

## Attribution

Adapted from Cursor's [`thermo-nuclear-code-quality-review`](https://github.com/cursor/plugins/tree/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review) skill.
