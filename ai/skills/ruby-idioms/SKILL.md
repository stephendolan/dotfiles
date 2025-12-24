---
name: ruby-idioms
description: Ruby language patterns and idioms. Use when writing Ruby code, reviewing diffs, or discussing Ruby style. Covers naming, conditionals, method organization, and the "fail loud" philosophy.
---

# Ruby Idioms

Patterns for clear, maintainable Ruby code.

## Philosophy: Fail Loud, Not Silent

Code should fail loudly on invalid assumptions rather than mask problems. Silent failures hide bugs; exceptions reveal them early.

### Trust Valid State

When context guarantees a value exists, don't add defensive nil checks:

```ruby
# Context: This code only runs when current_user is set
# Good - trusts the context
order.user.charge(order.total)

# Avoid - defensive check masks potential bugs
order.user&.charge(order.total)
```

If `order.user` is unexpectedly nil, an exception reveals the programming error immediately.

### Remove Unnecessary Guards

When refactoring, remove defensive checks that the calling context guarantees:

```ruby
# If the view only renders when Current.user exists:
# Good
subscription = subscriptions.find { |s| s.user_id == Current.user.id }

# Unnecessary - masks bugs if assumption is wrong
subscription = subscriptions.find { |s| s.user_id == Current.user&.id }
```

## Conditionals vs Guard Clauses

Prefer expanded conditionals for clarity. Use guard clauses only at method entry points.

### Expanded Conditionals

```ruby
# Preferred - clear flow, obvious return value
def todos_for_group
  if ids = params[:todo_ids]
    @bucket.todos.find(ids.split(","))
  else
    []
  end
end

# Avoid - guard clause for simple branching
def todos_for_group
  ids = params[:todo_ids]
  return [] unless ids
  @bucket.todos.find(ids.split(","))
end
```

### Guard Clauses at Entry

Guards work well when returning early before substantial logic:

```ruby
def after_commit(recording)
  return if recording.parent.was_created?

  if recording.was_created?
    broadcast_new(recording)
  else
    broadcast_change(recording)
  end
end
```

## Naming Conventions

### Explicit Over Brief

Names should reveal intent without requiring context:

```ruby
# Good - explicit purpose
request_method         # not: method (avoids collisions)
stripe_discount_id     # not: discount_id
format_date_for_grouping  # not: format_date

# Good - describes what it does
def store_referrer_user(user)
def check_email_still_matches
```

### Constants for Business Rules

Extract magic numbers and limits to named constants:

```ruby
class Friendship < ApplicationRecord
  MAX_FRIENDS_PER_USER = 500

  validate :user_friend_limit_not_exceeded, on: :create

  private

  def user_friend_limit_not_exceeded
    if user.friendships.count >= MAX_FRIENDS_PER_USER
      errors.add :base, "Maximum friend limit reached"
    end
  end
end
```

## Bang Methods

Only add `!` when a non-bang alternative exists with different behavior:

```ruby
# Correct - bang has non-bang counterpart
save! / save      # raises vs returns false
destroy! / destroy  # raises vs returns false

# Incorrect - no non-bang alternative
def process_payment!  # Don't use ! just because it's "dangerous"
  # ...
end
```

## Method Organization

### Order by Visibility and Call Sequence

```ruby
class Order
  # 1. Class methods
  def self.find_recent
    where("created_at > ?", 1.week.ago)
  end

  # 2. Public instance methods (initialize first)
  def initialize(attrs)
    @attrs = attrs
  end

  def process
    validate_items
    calculate_total
    charge_customer
  end

  private
  # 3. Private methods in call order
  def validate_items
    # called first
  end

  def calculate_total
    # called second
  end

  def charge_customer
    # called third
  end
end
```

### Visibility Modifier Formatting

No blank line after `private`/`protected`:

```ruby
# Good
private
def helper_method
  # ...
end

# Avoid
private

def helper_method
  # ...
end
```

## Rails Helpers Over Custom Code

Use built-in helpers:

```ruby
# Time
time_ago_in_words(created_at)
distance_of_time_in_words(start_time, end_time)

# Presence
name.presence || "Anonymous"  # not: name.blank? ? "Anonymous" : name

# Inclusion
status.in?(%w[active pending])  # not: %w[active pending].include?(status)

# Delegation
delegate :name, :email, to: :user
```

## Quick Reference

| Do                                              | Avoid                              |
| ----------------------------------------------- | ---------------------------------- |
| Let invalid state raise exceptions              | Defensive nil chains everywhere    |
| Expanded conditionals in method bodies          | Guard clauses for simple branching |
| Guards at method entry before substantial logic | Guards scattered throughout        |
| Explicit, descriptive names                     | Abbreviated or generic names       |
| Constants for business rules                    | Magic numbers inline               |
| `!` only with non-bang counterpart              | `!` to indicate "dangerous"        |
| Private methods in call order                   | Random private method ordering     |
