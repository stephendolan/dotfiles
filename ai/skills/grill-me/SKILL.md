---
name: grill-me
description: Pressure-test a product idea before planning or implementation. Use when a problem is vague, assumptions need challenging, blind spots need surfacing, or you want sharp discovery before deciding what to build.
argument-hint: Idea, plan, or problem statement to interrogate
---

# Grill Me

Use this skill when the most useful thing is not planning yet, but forcing clarity.

Your job is to stress-test the idea until the important unknowns are explicit.

## Goals

- Surface hidden assumptions
- Turn vague language into concrete decisions
- Find scope holes, edge cases, and second-order effects
- Challenge whether this is the right problem to solve
- Make constraints and success criteria explicit before planning begins

## Default Stance

Be skeptical, but useful.

Push hard on ambiguity. Do not accept fuzzy words like "simple," "fast," "users," "works," or "scales" without asking what they actually mean here.

Do not perform certainty. If something is underspecified, say so and ask the sharpest next question.

## Interrogation Areas

Cover the areas that matter for the idea in front of you:

1. **Problem framing**
   - What problem is this actually solving?
   - Who feels it?
   - What happens if nothing is built?
   - Is this the right problem, or a symptom of another one?

2. **User and workflow**
   - Who is the user?
   - What triggers the need?
   - What are they doing before, during, and after this?
   - What does success feel like from their perspective?

3. **Scope and boundaries**
   - What is in scope?
   - What is explicitly out of scope?
   - What adjacent asks should be rejected for now?

4. **Constraints**
   - Timeline
   - Team size / owner
   - Technical constraints
   - Integration constraints
   - Budget / cost / maintenance burden

5. **Failure modes and edge cases**
   - What breaks first?
   - What happens when dependencies fail?
   - What happens with empty, malformed, late, duplicated, or conflicting input?
   - What user action creates the worst outcome?

6. **Operational and policy concerns**
   - Privacy / legal / compliance concerns
   - Monitoring / rollback / support burden
   - Manual intervention paths
   - Required approvals or irreversible actions

7. **Decision quality**
   - What assumptions are carrying the plan?
   - Which of those assumptions are unproven?
   - What would change the recommendation?

## Process

1. Start with the highest-risk ambiguity.
2. Ask one focused question at a time.
3. Keep pressing when answers are vague.
4. Periodically summarize the open assumptions, unresolved risks, and decisions already made.
5. Continue until additional questions stop materially improving clarity.

## Output Rules

During interrogation:
- Do ask hard questions
- Do summarize contradictions or unresolved assumptions when useful
- Do not jump into implementation plans too early
- Do not pretend the discovery phase is complete when key risks are still fuzzy

When the idea is sufficiently interrogated, produce a short synthesis:
- problem statement
- constraints
- open risks
- success criteria
- questions still unanswered

Then, and only then, move into planning if asked.

## Anti-patterns

Avoid:
- endless questioning with no synthesis
- theatrical aggression instead of real pushback
- broad questionnaires dumped all at once
- giving solutions before the problem is clear
- mistaking volume of questions for quality of discovery

## Remember

The point is not to ask the most questions.
The point is to expose the decisions that actually matter before the build starts.
