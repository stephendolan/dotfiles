---
name: writing-skills
description: Expert guidance for creating effective Claude skills. Use when creating new skills, reviewing existing skills, or improving skill descriptions. Covers naming, descriptions, structure, and activation patterns based on Anthropic best practices.
allowed-tools: Read, Grep, Glob
---

This skill provides comprehensive guidance for creating high-quality Claude skills that are discoverable, efficient, and effective.

## Core Philosophy

Skills combat **distributional convergence** - Claude's tendency to produce generic outputs by sampling from high-probability training patterns. Well-crafted skills provide specialized, on-demand guidance that shapes HOW Claude works without permanent context overhead.

**Key principle**: "Any domain where Claude produces generic outputs despite having more expansive understanding is a candidate for skill development."

## Skill Characteristics

Effective skills are:

- **Composable** - Multiple skills work together automatically
- **Portable** - Work across Claude apps, Claude Code, and API
- **Efficient** - Only load when relevant (token-conscious)
- **Powerful** - Include executable scripts when code is more reliable than generation
- **Focused** - One clear capability per skill

## Naming Best Practices

**Format**: Lowercase letters, numbers, hyphens only (max 64 characters)

**Specificity Over Generality**:
- ✅ `conventional-commits` - Clear, specific domain
- ✅ `frontend-design` - Obvious what it covers
- ✅ `documentation-standards` - Specific to documentation
- ❌ `git-helper` - Too vague, what kind of help?
- ❌ `standards` - Standards for what?
- ❌ `patterns` - Patterns of what domain?

**Discoverability Rule**: The name should make it obvious when to use the skill. If someone sees the skill name in a list, they should immediately know what it does and when it's relevant.

**Domain Clarity**: Include the domain in the name when the capability could apply to multiple areas:
- `mcp-server-development` not `server-development`
- `react-component-design` not `component-design`
- `rails-api-standards` not `api-standards`

## Description Best Practices

**Required elements** (max 1,024 characters):

1. **What it does** - Core functionality
2. **When to use it** - Activation triggers
3. **Key domains/terms** - Words users would mention

**Pattern**: "[Core capability]. Use when [trigger scenarios]. [Key domain terms]."

**Examples**:

✅ **Good** - Specific with triggers:
```yaml
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, or applications. Guides typography choices, color schemes, animations, and spatial composition. Covers React, Vue, HTML/CSS implementations.
```

❌ **Too vague** - Missing triggers:
```yaml
description: Helps with frontend work and design decisions.
```

✅ **Good** - Clear domain and activation:
```yaml
description: Generate conventional commit messages following industry standards. Use when committing code, writing commit messages, or analyzing git diffs. Covers commit types (feat, fix, refactor), scope determination, and imperative mood formatting.
```

❌ **Missing trigger words**:
```yaml
description: Handles git commits using best practices.
```

**Trigger word strategy**: Include terms users naturally mention when working in this domain. Think: "What would someone say that should activate this skill?"

## Structure Patterns

Based on successful skills like `frontend-design` and `elegant-implementation`:

### 1. Opening Context
Brief paragraph explaining the skill's purpose and when it's used.

### 2. Philosophy/Thinking Section
Guide decision-making BEFORE prescriptive rules:
- Key questions to ask
- Mental framework
- Core principles

### 3. Guidelines Section
Focused, actionable guidance:
- Bold statements for emphasis
- "NEVER" / "ALWAYS" for critical rules
- Concrete examples
- Bullet lists for scannability

### 4. Anti-patterns (when applicable)
What to avoid, with specific examples

### 5. Remember/Principles Summary
Closing reminders of core philosophy

**Length target**: 40-150 lines for most skills. Concise beats comprehensive.

**Tone**: Bold, opinionated, directive. Use imperative mood. No hedging.

## Content Principles

**Self-documenting clarity**: Every line should have obvious purpose. No filler text.

**Actionable over theoretical**: Provide patterns to follow, not abstract concepts.

**Examples over explanation**: Show don't tell. Code snippets and before/after comparisons.

**Negative space**: What NOT to do is as important as what to do.

**Consistency signals**: Use similar structure to existing skills in the repository for familiarity.

## Skills vs Agents Decision Matrix

| Scenario | Use Skill | Use Agent |
|----------|-----------|-----------|
| Guidance during work | ✅ | ❌ |
| Simple, frequent tasks | ✅ | ❌ |
| Complex autonomous tasks | ❌ | ✅ |
| Multi-step orchestration | ❌ | ✅ |
| Pattern enforcement | ✅ | ❌ |

**Hybrid approach**: Create BOTH when tasks range from simple to complex:
- Skill guides main agent for 80% of cases
- Agent handles complex 20% requiring deep analysis
- Agent can use skill for standards/patterns

**Example**: Commits are usually simple (use skill), but complex multi-file refactors benefit from dedicated analysis (use agent).

## Supporting Files

Skills can include adjacent files:
- `/examples/` - Reference implementations
- `/templates/` - Starter code or structures
- `/scripts/` - Executable utilities
- `/docs/` - Extended reference material

**Token efficiency**: Only reference supporting files when needed. Don't bloat the main SKILL.md.

## Testing Your Skill

**Activation test**: Does the skill load for relevant tasks?
- Use trigger words in requests
- Verify it doesn't activate for unrelated work

**Clarity test**: Can someone unfamiliar understand when to use it?
- Show the name and description to a teammate
- Ask: "When would you use this?"

**Effectiveness test**: Does it improve outputs?
- Compare results with and without the skill
- Check for reduced generic/boilerplate responses

**Token test**: Is the guidance concise?
- Every line should justify its token cost
- Cut anything that doesn't change behavior

## Common Mistakes

**Overly broad scope**:
- ❌ One skill covering frontend, backend, and database
- ✅ Separate skills for each domain

**Vague descriptions**:
- ❌ "Helps with code quality"
- ✅ "Enforces linting standards, type safety, and test coverage for TypeScript projects"

**Missing activation triggers**:
- ❌ Description doesn't mention when to use it
- ✅ Includes specific scenarios and keywords

**Too prescriptive without philosophy**:
- ❌ Just a list of rules without context
- ✅ Explains WHY before HOW

**Redundant with existing tools**:
- ❌ Skill that just runs ESLint (use MCP/bash)
- ✅ Skill that guides code style decisions

## Versioning and Updates

**Document changes**: Note major updates in the SKILL.md
**Test after edits**: Verify activation still works
**Team communication**: Share significant changes
**Restart required**: Claude Code needs restart to pick up changes

## Meta-Pattern Recognition

Look for these signals that a skill would help:

1. **Repetitive instructions** - Same guidance given across multiple sessions
2. **Generic outputs** - Claude producing boilerplate that needs manual refinement
3. **Domain expertise** - Specialized knowledge that's not in base training
4. **Consistency enforcement** - Team standards that need systematic application
5. **Workflow automation** - Repeated multi-step processes

When you spot these patterns, create a skill.

## Remember

- **Specific beats generic** - Both in naming and content
- **Trigger words matter** - Include terms users naturally mention
- **One skill, one job** - Focus trumps comprehensiveness
- **Token efficiency** - Every line must earn its place
- **Test activation** - Verify the skill loads when expected
- **Philosophy first** - Guide thinking before prescribing actions

Skills are prompt engineering at scale. Make every word count.
