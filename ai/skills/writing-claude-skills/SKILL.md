---
name: writing-claude-skills
description: Create effective Agent Skills following the agentskills.io specification. Use when creating new skills, reviewing existing skills, or improving skill descriptions. Covers SKILL.md format, naming, descriptions, structure, progressive disclosure, and testing patterns.
allowed-tools: Read, Grep, Glob
---

# Writing Agent Skills

Agent Skills are modular packages that extend AI agent capabilities with specialized knowledge and workflows. Skills are directories containing a `SKILL.md` file with YAML frontmatter and Markdown instructions.

## Progressive Disclosure Model

Skills load in three stages to optimize context usage:

1. **Discovery** (~50-100 tokens): Agents load only names and descriptions at startup
2. **Activation** (<5000 tokens): Full SKILL.md loads when task matches description
3. **Execution**: Referenced files and scripts load only when needed

**Token budget**: Keep main SKILL.md under 500 lines. Move detailed content to supporting files.

## SKILL.md Structure

```yaml
---
name: skill-name-here
description: What it does. Use when [triggers]. Covers [keywords].
license: Apache-2.0  # optional
compatibility: Requires Python 3.8+  # optional
allowed-tools: Read, Grep, Glob  # optional, experimental
metadata:  # optional, for custom properties
  version: "1.0"
---

[Markdown body with instructions, examples, guidelines]
```

## Required Fields

### name

- 1-64 characters, lowercase alphanumeric with hyphens only
- Cannot start/end with hyphens or contain consecutive hyphens
- Must match parent directory name

**Naming Principles**:

- ✅ `conventional-commits` - Specific, clear domain
- ✅ `rails-api-standards` - Includes domain qualifier
- ❌ `git-helper` - Too vague
- ❌ `standards` - Standards for what?

Include the domain when the capability could apply to multiple areas: `mcp-server-development` not `server-development`.

### description

- 1-1024 characters (aim for ~200 for conciseness)
- **Critical field**: Agents use this to decide when to activate the skill

**Required elements**:

1. **What it does** - Core capability
2. **When to use it** - Activation triggers
3. **Keywords** - Terms users naturally mention

**Pattern**: "[Capability]. Use when [triggers]. Covers [keywords]."

✅ **Good**:

```yaml
description: Create distinctive, production-grade frontend interfaces. Use when building web components, pages, or applications. Covers React, Vue, typography, color schemes, and animations.
```

❌ **Vague**:

```yaml
description: Helps with frontend work and design.
```

## Optional Fields

- **license**: Skill distribution terms (e.g., "Apache-2.0")
- **compatibility**: Environment requirements (e.g., "Requires Node.js 18+")
- **allowed-tools**: Space-delimited pre-approved tools (experimental)
- **metadata**: Custom key-value properties

## Directory Structure

```
my-skill/
├── SKILL.md           # Required: metadata + instructions
├── scripts/           # Optional: executable code
│   └── validate.py
├── references/        # Optional: extended documentation
│   └── REFERENCE.md
└── assets/            # Optional: templates, diagrams, data files
    └── template.json
```

**scripts/**: Self-contained Python, Bash, or JavaScript with clear error messages.

**references/**: Extended documentation loaded on demand. Keep files focused and one level deep.

**assets/**: Static resources like templates and configuration files.

## Body Content Patterns

### 1. Opening Context

Brief paragraph explaining purpose and when the skill activates.

### 2. Philosophy Section

Guide decision-making BEFORE prescriptive rules:

- Key questions to ask
- Mental framework
- Core principles

### 3. Guidelines

Focused, actionable guidance:

- Bold statements for emphasis
- Strong directives for critical rules
- Concrete examples
- Bullet lists for scannability

### 4. Anti-patterns

What to avoid, with specific examples.

### 5. Closing Summary

Core philosophy reminders.

**Tone**: Bold, opinionated, directive. Use imperative mood.

## Content Principles

- **Self-documenting clarity**: Every line should have obvious purpose
- **Actionable over theoretical**: Patterns to follow, not abstract concepts
- **Examples over explanation**: Show don't tell
- **Negative space**: What NOT to do matters as much as what to do
- **Token efficiency**: Every line must justify its context cost

## Common Mistakes

**Overly broad scope**:

- ❌ One skill covering frontend, backend, and database
- ✅ Separate skills for each domain (composability wins)

**Missing activation triggers**:

- ❌ Description without "Use when..."
- ✅ Specific scenarios and keywords in description

**Too prescriptive without philosophy**:

- ❌ Just a list of rules
- ✅ Explains WHY before HOW

**Redundant with tools**:

- ❌ Skill that just runs a linter
- ✅ Skill that guides decision-making

## Testing Your Skill

### Activation Test

- Use trigger words in requests
- Verify it doesn't activate for unrelated work

### Clarity Test

- Show name and description to a teammate
- Ask: "When would you use this?"

### Effectiveness Test

- Compare results with and without the skill
- Check for reduced generic/boilerplate responses

### Validation

```bash
# Use the skills-ref library
skills-ref validate ./my-skill
```

## Packaging for Distribution

ZIP structure must have the skill folder at the root:

```
my-skill.zip
└── my-skill/
    ├── SKILL.md
    └── resources/
```

## Security Considerations

For skills with executable scripts:

- Run scripts in isolated/sandboxed environments
- Never hardcode API keys or secrets
- Request user approval before dangerous operations
- Review downloaded skills before enabling

## Skills vs Agents Decision Matrix

| Scenario                 | Skill | Agent |
| ------------------------ | ----- | ----- |
| Guidance during work     | ✅    | ❌    |
| Simple, frequent tasks   | ✅    | ❌    |
| Complex autonomous tasks | ❌    | ✅    |
| Multi-step orchestration | ❌    | ✅    |
| Pattern enforcement      | ✅    | ❌    |

**Hybrid approach**: Create both when tasks range from simple to complex. Skill handles 80% of cases; agent handles complex 20%.

## Meta-Pattern Recognition

Create a skill when you see:

1. **Repetitive instructions** - Same guidance across sessions
2. **Generic outputs** - Claude producing boilerplate needing refinement
3. **Domain expertise** - Specialized knowledge not in base training
4. **Consistency enforcement** - Team standards needing systematic application
5. **Workflow automation** - Repeated multi-step processes

## Resources

- **Specification**: https://agentskills.io/specification
- **Examples**: https://github.com/anthropics/skills
- **Validation**: https://github.com/agentskills/agentskills/tree/main/skills-ref

## Remember

- **Specific beats generic** - In naming and content
- **Trigger words matter** - Include terms users naturally mention
- **One skill, one job** - Focus trumps comprehensiveness
- **Token efficiency** - Keep under 500 lines, every line earns its place
- **Progressive disclosure** - Main instructions first, details in references
- **Test activation** - Verify the skill loads when expected

Skills are prompt engineering at scale. Make every word count.
