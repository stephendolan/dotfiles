Examine codebase architecture using parallel architect agents, then validate top findings with plan-refiner.

## Workflow

**Phase 1: Discovery**

1. Identify 4-8 architectural surfaces (vertical flows, horizontal layers, cross-cutting concerns, structural patterns)
2. Launch parallel architect agents, one per surface
3. Aggregate findings and rank by severity/effort

**Phase 2: Validation** 4. Take top 3-5 findings to plan-refiner 5. Filter out findings where solution path is unclear 6. Present prioritized, validated opportunities

## Architectural Surfaces

**Vertical**: Auth flow, data persistence, API request/response, error handling
**Horizontal**: UI/presentation, business logic, data access, integrations
**Cross-cutting**: State management, testing, configuration, logging
**Structural**: Component organization, dependencies, build/deployment

Choose surfaces based on project size, recent activity, pain points, and tech stack.

## Ranking Criteria

1. **High**: High/Critical severity + Low/Medium effort
2. **Medium**: Medium severity + Low effort, OR High severity + High effort
3. **Lower**: All other findings

## Validation Question

"If we wanted to address this architectural issue, is there a clear, simple path to improvement?"

Keep only findings where both problem AND solution are tractable.

## Output Format

```
ARCHITECTURE EXAMINATION COMPLETE

Surfaces examined: X
Findings identified: Y
High-confidence improvements: Z

TOP OPPORTUNITIES (validated):

1. [Finding Title] - Severity: X | Effort: Y | Files: Z
   Issue: [Description]
   Impact: [What's hard because of this]
   Approach: [High-level fix strategy]
   Validation: [Plan-refiner assessment]

2. [...]

ADDITIONAL FINDINGS (not validated):

- [Finding] - Severity/Effort
- [...]

NEXT STEPS:
Select a finding to address, or run /refine-implementation on specific area.
```

## Execution

Phase 1 runs architect agents in parallel (4-8 surfaces). Phase 2 validates top 3-5 findings sequentially with plan-refiner. Only recommend issues that are both important AND fixable.
