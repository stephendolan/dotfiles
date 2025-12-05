Examine codebase architecture using parallel surface architects, consolidate with code-architect agent, then validate plans with plan-refiner.

## Workflow

**Phase 1: Discovery**

1. Identify 4-8 architectural surfaces
2. Launch parallel architect agents, one per surface
3. Each agent outputs findings with severity/effort/approach

**Phase 2: Consolidation**

4. Launch code-architect agent to consolidate all surface findings
5. Merge overlapping findings, identify root causes, create implementation plans

**Phase 3: Validation**

6. Launch plan-refiner to review implementation plans
7. Eliminate over-engineering, validate tractability, suggest simplifications
8. Present validated fixes with implementation plans

## Architectural Surfaces

**Vertical**: Auth flow, data persistence, API request/response, error handling
**Horizontal**: UI/presentation, business logic, data access, integrations
**Cross-cutting**: State management, testing, configuration, logging
**Structural**: Component organization, dependencies, build/deployment

Choose surfaces based on project size, recent activity, pain points, and tech stack.

## Consolidation Phase

The code-architect agent consolidates all surface findings:
- Merges overlapping findings across surfaces
- Identifies root causes spanning multiple areas
- Prioritizes by impact with full codebase view
- Creates step-by-step implementation plans

## Plan-Refiner

- Eliminate over-engineering
- Validate tractability
- Suggest simpler approaches
- Prioritize by simplicity × impact

## Output Format

```
ARCHITECTURE EXAMINATION COMPLETE

Surfaces examined: X
Raw findings: Y
Consolidated issues: Z
Validated fixes: N

ACTIONABLE FIXES (ready to implement):

1. [Issue Title] - Severity: X | Effort: Y | Files: Z

   Problem: [What's architecturally wrong]
   Impact: [What's hard because of this]
   Root cause: [Why this exists across surfaces]

   Implementation Plan:
   1. [Step with file references]
   2. [Step with file references]
   3. [...]

   Plan-refiner notes: [Simplifications applied, validation]

2. [...]

DEFERRED:

- [Issue] - Why: [Too complex / Low impact / Library handles this]
- [...]
```

## Execution

**Phase 1**: Launch 4-8 code-architect agents in parallel (one per surface)

**Phase 2**: Launch code-architect agent to consolidate all surface findings

**Phase 3**: Launch plan-refiner agent to validate implementation plans
