---
name: task-management
description: Manage personal tasks using OmniFocus via the `of` CLI. Use when discussing tasks, projects, inbox processing, GTD workflow, or adding/organizing to-dos. Covers both task clarity (next actions, controllable outcomes) and CLI operations.
---

# Task Management with OmniFocus

Manage the user's personal tasks and projects through the `of` CLI. Apply GTD principles to clarify work while using the CLI to capture and organize.

## When to Apply

**Use for:** Tasks, inbox processing, project planning, follow-ups, meeting action items
**Not for:** Code implementation planning, technical architecture

## CLI Reference

### Inbox

```bash
of inbox ls                      # List inbox items
of inbox count                   # Get inbox count
of inbox add "Task name"         # Quick capture
of inbox add "Task" --note "Details" --due "Friday" --flagged
```

### Tasks

```bash
of task ls                       # List all tasks
of task ls --flagged             # Flagged tasks only
of task ls --project "ProjectName"
of task ls --tag "waiting"
of task create "Task" --project "Project" --tag "home" --due "tomorrow"
of task view "task-id"
of task update "task-id" --flagged --due "next week"
of task delete "task-id"
of task stats                    # Task statistics
```

### Projects

```bash
of project ls                    # List active projects
of project ls --folder "Work"
of project ls --status "on hold"
of project create "Project Name" --folder "Area" --sequential
of project view "project-id"
of project update "project-id" --status "on hold"
of project stats
```

### Search & Views

```bash
of search "keyword"              # Search tasks by name/note
of perspective ls                # List perspectives
of perspective view "Today"      # View tasks in perspective
```

### Tags & Folders

```bash
of tag ls                        # List tags with usage
of tag create "waiting"
of tag stats
of folder ls                     # Folder hierarchy
of folder view "Work"
```

### Date Formats

The CLI accepts flexible date formats:
- `today`, `tomorrow`, `Friday`
- `next week`, `in 3 days`
- `2024-01-15`, `Jan 15`

## Action Clarity

When the user describes work, transform vague into concrete:

| Vague | Concrete |
|-------|----------|
| "Follow up with client" | "Draft email about contract terms" |
| "Handle the thing" | "Call vendor about pricing" |
| "Work on presentation" | "Outline three key points for deck" |

### Controllable Over Outcome

Focus on effort, not results:

| Outcome-focused | Controllable |
|-----------------|--------------|
| "Close the deal" | "Send proposal by Tuesday" |
| "Get approval" | "Submit complete proposal for review" |
| "Make client happy" | "Respond to questions within 24 hours" |

### Project vs Single Action

**Single action:** One concrete step
- "Call vendor about pricing"
- "Draft memo to team"

**Project:** Multiple steps required
- "Prepare board presentation" = research + draft + rehearse + review

Always identify the immediate next action first.

## Common Workflows

### Quick Capture

When the user mentions something to do:
```bash
of inbox add "The thing they mentioned"
```

### Process Inbox

Review and clarify each item:
```bash
of inbox ls
# For each item, decide: delete, do now, delegate, defer, or file
of task update "item-id" --project "Relevant Project"
```

### Weekly Review

```bash
of project ls                    # Review all projects
of task ls --tag "waiting"       # Check waiting-for items
of perspective view "Review"     # Custom review perspective
```

### Add Structured Project

```bash
of project create "Launch Feature X" --folder "Work" --sequential
of task create "Draft requirements doc" --project "Launch Feature X"
of task create "Review with team" --project "Launch Feature X"
of task create "Submit for approval" --project "Launch Feature X"
```

## Communication Style

Frame naturally without imposing frameworks:

- "Sounds like the next step is drafting that email?"
- "What can you control here?"
- "Should I add that to your inbox?"

Avoid:
- "Here's your GTD structure with contexts..."
- "Let me organize your next actions list..."

## Principles

- **Concrete beats vague:** Actual next step, not intention
- **Controllable beats outcome:** Effort over results
- **Honest beats aspirational:** Real constraints, not motivation tricks
- **Capture beats remember:** Get it into OmniFocus immediately
