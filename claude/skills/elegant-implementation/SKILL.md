---
name: elegant-implementation
description: Build features with radical simplicity and intentional design. Use when developing new functionality to ensure minimal, maintainable, and elegant solutions from the start.
---

This skill guides feature development with simplicity-first thinking. Before writing code, think deeply about the problem. During implementation, challenge every abstraction. After completion, refine ruthlessly.

The user provides feature requirements: functionality to build, problems to solve, or systems to extend. They may include context about constraints or existing patterns.

## Implementation Thinking

Before coding, answer these questions with brutal honesty:

- **Minimum Viable**: What's the absolute minimum that solves this problem? Not "phase 1" - the actual minimum.
- **Assumed Complexity**: What complexity am I assuming is necessary? Why?
- **Existing Solutions**: What patterns, utilities, or code already exist that I can reuse?
- **Future Clarity**: Will this be instantly understandable in 6 months? If not, why not?
- **Scope Creep**: What am I building that wasn't requested? Why?

**CRITICAL**: Resist the urge to build flexible systems for theoretical future needs. Build exactly what's needed now. Refactoring later is cheaper than wrong abstractions now.

## Elegance Guidelines

Focus on:

- **Self-Documenting Code**: Names should eliminate the need for comments. If code needs explanation, improve the structure. Comments should explain WHY (business logic, constraints, workarounds), never WHAT.
- **Pattern Consistency**: Match existing codebase patterns exactly. Consistency is more valuable than personal preference. One pattern executed well beats two competing approaches.
- **Minimal Abstraction**: Every abstraction must justify its existence with multiple concrete use cases. "We might need this later" is not justification.
- **Direct Solutions**: Prefer straightforward implementations over elaborate frameworks. Three simple functions beat one configurable factory.
- **Aggressive Normalization**: Duplication is sometimes acceptable during exploration, but must be eliminated before completion. Extract common patterns, unify divergent approaches.

**NEVER** build features that aren't explicitly requested, create abstractions for single use cases, add configuration for theoretical scenarios, copy patterns from larger systems without understanding why they're complex, or write comments that explain what the code does (improve the code instead).

## Development Process

1. **Start with the simplest possible implementation** - Hardcode values, skip edge cases, ignore error handling. Get the core logic working.

2. **Add only what's required** - Error handling for real scenarios, validation for actual constraints, configuration for known variation points.

3. **Normalize and refine** - Extract duplication, unify patterns, improve naming, remove scaffolding.

4. **Challenge your own work** - Is every line necessary? Does every abstraction have multiple uses? Are names instantly clear?

## Complexity Checkpoints

At each checkpoint, ask:

**After initial implementation**:
- Could this be simpler and still work?
- What did I add that wasn't requested?
- What abstractions have only one use?

**Before completion**:
- Is this code consistent with existing patterns?
- Have I normalized all duplication?
- Can someone unfamiliar understand this in 2 minutes?

**If answering "no"** to any question: Stop and simplify before proceeding.

## Anti-Patterns to Remove Immediately

- **Premature abstraction** - Interfaces with one implementation, generic utilities for specific cases
- **Just-in-case code** - Handling scenarios that aren't in requirements
- **Configuration bloat** - Options that will never be used
- **Explanatory comments** - Replace with better naming and structure
- **Inconsistent patterns** - Different approaches to the same problem
- **Gold-plating** - Features beyond requirements "while we're at it"

## Remember

- **Simple isn't easy** - Elegance requires more thought than complexity, not less
- **Refactor > comment** - If code needs explanation, improve the code
- **Delete > add** - The best code is code you don't write
- **Consistency > novelty** - Match existing patterns over introducing new ones
- **Now > later** - Build for today's requirements, refactor when tomorrow's arrive

The goal isn't to write less code - it's to write exactly the right amount of code, no more, no less. Every line should have a clear purpose. Every abstraction should pay for itself. Every pattern should be consistent with the codebase.

**Target**: Code that makes reviewers think "I couldn't make this simpler if I tried."
