---
name: writing-claude-prompts
description: Best practices for writing Claude Code skills, CLAUDE.md files, and prompts optimized for Opus 4.7. Use when creating or reviewing skills, writing agent instructions, or optimizing prompts for Claude 4.x models.
---

# Claude Prompting Best Practices

## Opus 4.7 Behavioral Characteristics

Opus 4.7 has specific behavioral characteristics that affect prompt design:

- **Literal instruction-following** — Won't silently generalize or infer requests you didn't make. Precision in, precision out.
- **Task-calibrated response length** — Short answers on simple lookups, long ones on open-ended analysis. Don't rely on a fixed verbosity baseline.
- **Direct tone** — More opinionated, less validation-forward, fewer emoji than 4.6.
- **Built-in progress updates** — Provides regular status updates in long agentic traces without prompting. Scaffolding that forces interim summaries is usually redundant.
- **Fewer subagents and tool calls by default** — Prefers reasoning over delegation. Steerable via prompt and effort level.
- **Strict effort calibration** — At `low`/`medium`, scopes work tightly to what was asked. Risks under-thinking on complex tasks at `low`.
- **Stricter cybersecurity safeguards** — May refuse legitimate security work without context.

## Effort Levels

The `effort` parameter is the primary lever for tuning intelligence vs. speed/cost on Opus 4.7. Choose based on task type:

| Effort   | When to use                                                              |
| -------- | ------------------------------------------------------------------------ |
| `max`    | Intelligence-demanding tasks; risks overthinking and diminishing returns |
| `xhigh`  | Default for coding and agentic use cases                                 |
| `high`   | Minimum for most intelligence-sensitive work                             |
| `medium` | Cost-sensitive work where reduced intelligence is acceptable             |
| `low`    | Short, scoped, latency-sensitive tasks; risks under-thinking             |

For agentic loops at `xhigh`/`max`, set `max_tokens` to at least 64k for headroom.

## Core Principles

### Be Explicit and Specific

Opus 4.7 is literal. Vague instructions get vague execution; "obvious" implications won't be inferred.

```markdown
# Vague (less effective)

- Prioritize simplicity and well-structured code
- Use good architecture patterns

# Explicit (more effective)

- Implement exactly what was requested, nothing more
- Place domain logic in models, external API calls in service objects
- Use Capybara's click_on, fill_in methods with visible text labels
```

### Provide Context and Motivation

Explain _why_ behavior matters so Opus 4.7 can apply it to edge cases, not just the literal example:

```markdown
# Without context

- Let code fail loudly on invalid assumptions

# With context (more effective)

- Let code fail loudly on invalid assumptions — this reveals programming
  errors early rather than masking bugs with defensive checks
```

### Calibrate Response Length Explicitly

Opus 4.7 calibrates length to perceived complexity. If you want a specific style, say so with examples rather than negative instructions:

```markdown
# Less effective

Don't be verbose.

# More effective

Provide concise, focused responses. Skip non-essential context. Lead with
the answer in one sentence; add detail only if the question requires it.
```

Positive examples of the desired voice tend to outperform "don't" lists.

### Steer Subagent and Tool Use Explicitly

If a workflow benefits from subagents or aggressive tool use, say so directly. Opus 4.7's defaults skew toward reasoning over delegation:

```markdown
# Effective

When the task decomposes into independent pieces, delegate each to a
subagent and run them in parallel. This protects context and parallelizes work.

For unfamiliar code, read files before proposing edits. Don't propose
changes based on guessed behavior.
```

### Use Positive Framing

Describe what to do rather than what to avoid. Opus 4.7 follows positive instructions more reliably than prohibitions.

### Soften Emphatic Language

Opus 4.7 is less reactive to emphatic caps than earlier models, but normal prose still reads better and avoids edge-case overtriggering.

| Avoid                                       | Prefer                               |
| ------------------------------------------- | ------------------------------------ |
| "CRITICAL: You MUST use this tool when..."  | "Use this tool when..."              |
| "ALWAYS call the search function before..." | "Call the search function before..." |
| "NEVER skip this step"                      | "Don't skip this step"               |

**Exception:** Emphatic language earns its place when skipping a step leads to wrong answers — e.g., "Read and understand relevant files before proposing code edits."

## Skill Structure

### File Naming and Layout

```
skill-name/
├── SKILL.md              # Required - uppercase, contains frontmatter + content
└── references/           # Optional - supporting reference material
    └── reference.md      # Claude reads these only when needed
```

### YAML Frontmatter

```yaml
---
name: skill-name # lowercase, hyphens, max 64 chars
description: What the skill does. Use when [trigger conditions]. Covers [scope].
---
```

**Description requirements:**

- Maximum 1024 characters
- Include BOTH what it does AND when to use it (trigger terms)
- Be specific, not generic

```yaml
# Effective description
description: Guide for writing Ruby and Rails code in this codebase. Use when
implementing features, fixing bugs, refactoring, or reviewing code. Covers
code style, architecture patterns, testing, and Rails conventions.
```

### Skill Naming

- Lowercase letters, numbers, and hyphens only
- Maximum 64 characters
- Specific and descriptive
- Match domain terminology users would search for

### Scope: One Capability Per Skill

A skill should address one focused problem domain. If you need "and/or" or long lists of unrelated capabilities, consider splitting.

Examples of appropriately focused skills:

- "pdf-form-filling"
- "rails-hotwire"
- "customer-support-debugging"

## Content Best Practices

### Use Concrete Examples

Provide working code examples like `StripeService.create_subscription(team, plan)` rather than abstract descriptions like "Use service objects for external API calls."

### Structure with Tables for Reference

Tables make lookup information scannable. Use them for tool references, command options, and comparison matrices.

### Use Step-by-Step Workflows

Explicit numbered steps give clear actions. List the specific sequence of operations to perform.

### Move Reference Content to Separate Files

Keep SKILL.md focused on workflows. Move large reference tables and lookup data to `references/` subdirectory.

## Context Management

### Keep Content Focused

Every token in a skill enters the context window when activated, affecting both cost and performance. Optimize for signal by removing redundant examples, avoiding repetition of standard conventions Claude already knows, and moving lookup tables to reference files.

### Match Prompt Style to Output Style

Formatting in prompts influences response formatting. Use prose paragraphs unless bullet lists are necessary, as this reduces markdown artifacts in responses.

## Anti-Patterns to Avoid

| Anti-Pattern                                     | Problem                                            | Fix                                  |
| ------------------------------------------------ | -------------------------------------------------- | ------------------------------------ |
| Excessive negative framing                       | Less reliable than positive instructions           | Reframe as positive instructions     |
| Forcing interim status ("after every N steps")   | Redundant — 4.7 emits its own progress updates     | Remove unless the cadence is wrong   |
| Vague philosophical statements                   | 4.7 won't infer the intent                         | Replace with specific patterns       |
| Very broad skill scope                           | Unclear when to activate                           | Split into focused skills            |
| Lowercase `skill.md`                             | May not be discovered                              | Use `SKILL.md` (uppercase)           |
| Length-control prompts copied from older models  | Conflicts with 4.7's task-calibrated baseline      | Re-baseline, then tune with examples |
