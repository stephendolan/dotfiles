# Ideation and autonomous selection

This playbook operationalizes the Discover and early Define stages from Anshu
Chimala's [How to turn your AI into a world-class designer](https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world).
Chimala credits String Seed of Thought to Sakana AI; see the
[Sakana AI technical article](https://pub.sakana.ai/ssot/) and
[paper](https://arxiv.org/abs/2510.21150). The candidate brief and tournament
below are adaptations for autonomous agents, not claims about Chimala's exact
process.

## 1. Establish the quality bar

Write a compact quality-bar card before ideating:

- **Job:** the outcome this surface must create.
- **Audience and context:** who is using it, where, and under what pressure.
- **Surface role:** help the user decide, do, understand, or explore.
- **Truth:** real content, product behavior, brand assets, and incumbent patterns
  that the design must respect.
- **Feeling:** the specific emotional response worth designing for.
- **Freedom:** which visual and interaction decisions may change.
- **Constraints:** platform, accessibility, performance, schedule, and asset
  availability.
- **Reference bar:** a small set of excellent relevant examples, treated as a
  quality baseline rather than material to copy.

The card is complete when a reviewer can reject an attractive but wrong design
without needing more product context.

## 2. Explore beyond the default distribution

Generate enough candidates to expose real contrast, usually five to eight.
Keep them terse until they show promise. Cover different exploration lanes
rather than producing cosmetic variations of one layout:

- amplify a truth already unique to the product;
- borrow structure or material from a distant domain;
- break one conventional layout rule while preserving usability;
- derive a direction from a seed string;
- pursue radical restraint and let one element carry the identity;
- make one signature interaction or image the organizing idea.

### Seed strings

Use seed strings only to introduce outside variation into a task with multiple
valid answers.

1. Generate a long random alphanumeric string with a local random source when
   available. Do not ask the language model to imitate randomness when a real
   random source is cheap.
2. Split or transform the string into independent decisions across composition,
   density, geometry, color or material, typography, imagery, and motion.
3. Interpret those decisions through the quality-bar card. The seed creates
   divergence; it does not overrule product fit or craft.
4. Keep the seed out of the shipped interface unless it has product meaning.

Reject seed-driven candidates that merely rename familiar defaults. The point
is a different decision path, not randomness as decoration.

When the user explicitly authorizes parallel agent exploration, give every
generator the same quality-bar card but a different lane or seed. Have each
return only its candidate brief and proof idea; keep comparison and selection
with the owning agent so the result does not become design by committee.

### Ambitious prompts

Describe a sensory or structural world, not a pile of style adjectives. Useful
sources include games, scientific instruments, editorial systems, physical
spaces, stagecraft, industrial objects, natural processes, and culturally
specific visual traditions. Translate the inspiration into interface rules:

- what becomes the spatial metaphor;
- what controls hierarchy and rhythm;
- which material or color behavior carries the feeling;
- which expected convention is being challenged;
- how the user still recognizes controls and completes the job.

Prefer an improbable but internally coherent direction over a vaguely
"creative" one. Save promising directions that current tools cannot execute;
capability changes may make them viable later.

## 3. Turn ideas into comparable briefs

Give every surviving candidate the same compact shape:

```markdown
### Working title
- Product truth:
- Intended feeling:
- Organizing metaphor:
- Composition and hierarchy:
- Typography and color/material:
- Imagery or motion:
- Signature moment:
- Deliberate anti-goals:
- Main usability or feasibility risk:
- Smallest proof to build:
```

A direction is not ready for selection when it is only adjectives, depends on
placeholder copy, could fit any product after changing the logo, or lacks a
small proof that would reveal whether it works.

## 4. Select without averaging

### Gate

Eliminate a candidate when it violates the quality-bar card, obscures the main
task, depends on unavailable assets or technology, or cannot meet the required
accessibility and performance floor. Attractive constraint failures do not
advance.

### Blind comparison

Compare the survivors as anonymous briefs or thumbnails when practical. Hide
which model produced them, how long they took, and their implementation details.
For each pair, decide which one is stronger on:

- product inevitability: it feels born from this product rather than applied;
- conceptual integrity: its choices reinforce one another;
- distinctiveness: it escapes familiar category and AI defaults;
- hierarchy and usability: the user's next action remains legible;
- emotional specificity: it creates a named feeling rather than generic polish;
- signature payoff: it contains one memorable moment worth the complexity;
- execution realism: the team can ship its essential idea well.

The winner should survive subtraction: removing decoration makes its core idea
clearer, not disappear.

### Tournament

Run pairwise comparisons until one direction wins. Keep a short decision record:

```markdown
Selected: <direction>
Decisive reason: <the product-specific advantage>
Runner-up: <direction>
Why it lost: <the most important trade-off>
Risk to prove: <the winner's largest uncertainty>
Proof: <the smallest build or render that resolves the risk>
```

Choose and proceed when the winner is reversible. Ask the user only when the
remaining choice encodes materially different product meaning or another
consequential commitment. When no candidate wins convincingly, generate a new
batch from different stimuli instead of averaging weak ideas together.

## 5. Freeze the direction, not every detail

After selection, write the design identity at the level needed to keep later
decisions coherent:

- one-sentence point of view;
- composition and spatial rules;
- type roles and scale behavior;
- palette and material behavior;
- geometry, density, and rhythm;
- imagery and motion roles;
- signature moment;
- anti-goals that would collapse it back toward the default.

Leave component-level decisions open until the representative proof reveals
what the direction actually needs.
