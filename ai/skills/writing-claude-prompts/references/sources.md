# Source References

Official Anthropic documentation and resources for Claude prompting best practices.

## Primary Sources

### Claude Prompting Best Practices

https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices

Core prompting guidance for current Claude models. Covers:

- Explicit instruction requirements
- Context and motivation
- Calibrating effort and thinking depth
- Steering tone, length, and tool use
- Adaptive thinking guidance

### Claude Models Migration Guide

https://platform.claude.com/docs/en/about-claude/models/migration-guide

Migration guidance across Claude model versions, including the Opus 4.7 section. Covers:

- Behavioral differences between versions
- Breaking changes (sampling parameters, prefill, extended thinking removed on 4.7)
- Effort parameter and adaptive thinking
- Tokenization changes
- Recommended `max_tokens`, task budgets, and high-resolution image handling

### Adaptive Thinking

https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking

Replaces the deprecated `budget_tokens` extended thinking on Opus 4.7. Adaptive thinking lets the model decide thinking depth per turn, steered by the `effort` parameter.

### Effort Parameter

https://platform.claude.com/docs/en/build-with-claude/effort

Primary lever for tuning intelligence vs. cost/latency on Opus 4.7. Documents `low`, `medium`, `high`, `xhigh`, and `max` levels and their recommended use cases.

### Claude Code Best Practices

https://www.anthropic.com/engineering/claude-code-best-practices

Engineering blog post on effective Claude Code usage. Covers:

- Being specific vs vague
- Research and planning before implementation
- Using CLAUDE.md files
- Visual and tangible targets
- Workflow patterns

### Effective Context Engineering for AI Agents

https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

Guidance on managing context for agentic applications. Covers:

- Finding high-signal tokens
- System prompt "Goldilocks zone"
- Avoiding hardcoded logic vs vague guidance
- Structured formats for state management

## Additional Resources

### Prompt Improver

https://www.anthropic.com/news/prompt-improver

Tool for automatically refining prompts using prompt engineering techniques.

### Prompt Generator

https://www.anthropic.com/news/prompt-generator

Generate production-ready prompt templates in the Anthropic Console.

### Anthropic Academy

https://www.anthropic.com/learn/build-with-claude

Learning resources for building with Claude.

## Key Takeaways by Source

### From Claude Prompting Best Practices

- Opus 4.7 is literal; explicit direction outperforms implied intent
- Provide context explaining _why_ behavior matters
- Calibrate response length and tone with positive examples, not "don't" lists
- Steer subagent and tool use explicitly — defaults skew toward reasoning
- Use the `effort` parameter as the primary intelligence lever

### From Migration Guide (Opus 4.7)

- Remove `temperature`, `top_p`, `top_k` (returns 400)
- Remove assistant message prefills (returns 400)
- Replace extended thinking `budget_tokens` with adaptive thinking + `effort`
- New tokenizer uses up to ~35% more tokens; raise `max_tokens` budgets
- High-resolution image support up to 2576px; can use up to ~3x image tokens
- Default to `xhigh` for coding/agentic, minimum `high` for intelligence-sensitive work

### From Claude Code Best Practices

- Specificity reduces course corrections
- "Include as many relevant features as possible" beats "Create a dashboard"
- Lead with research and planning before coding
- Provide visual targets (screenshots, test cases, mocks)

### From Context Engineering

- Find smallest set of high-signal tokens
- System prompts need the right "altitude" (not too rigid, not too vague)
- Use structured formats (JSON, prose) for state tracking
- Prompt chaining improves accuracy for multi-step tasks
