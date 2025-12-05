---
name: rails-migrations
description: Safe Rails database migration patterns. Use when writing migrations, removing columns, or making schema changes. Covers two-phase deployments, Strong Migrations, and pre-deployment scripts.
---

# Rails Database Migrations

Patterns for safe, zero-downtime database changes.

## Philosophy: Safe by Default

Migrations run in production during deployment. A failed migration can block deploys or cause downtime. Design migrations to be:

- **Reversible** - Can roll back if needed
- **Non-blocking** - Don't lock tables for extended periods
- **Deployment-safe** - Work with old and new code running simultaneously

## Two-Phase Column Removal

Never remove a column in one step. Code may still reference it during deployment.

### Phase 1: Ignore Column, Remove Code

```ruby
# In model - tell Rails to ignore the column
class User < ApplicationRecord
  self.ignored_columns += ["deprecated_field"]
end
```

Deploy this change. Remove all code referencing the column.

### Phase 2: Drop Column (Separate Migration)

After verifying Phase 1 is stable in production:

```ruby
class RemoveDeprecatedFieldFromUsers < ActiveRecord::Migration[7.1]
  def change
    safety_assured { remove_column :users, :deprecated_field }
  end
end
```

### Why Two Phases?

1. During deployment, old code (referencing column) and new code run simultaneously
2. If old code queries the column after it's dropped → errors
3. `ignored_columns` lets new code work while column still exists
4. Separate deploy confirms no code references the column

## Strong Migrations Patterns

### `safety_assured` for Known-Safe Operations

When you've verified an operation is safe, wrap it:

```ruby
class AddForeignKeyToOrders < ActiveRecord::Migration[7.1]
  def change
    # Safe because we cleaned up orphaned records first
    safety_assured do
      add_foreign_key :orders, :users, validate: false
    end
  end
end
```

### Adding NOT NULL Safely

Don't add NOT NULL directly—it locks the table for validation:

```ruby
# Phase 1: Add check constraint (doesn't lock)
class AddEmailNotNullConstraint < ActiveRecord::Migration[7.1]
  def change
    add_check_constraint :users, "email IS NOT NULL", name: "users_email_not_null", validate: false
  end
end

# Phase 2: Validate constraint (separate migration, after backfill)
class ValidateEmailNotNullConstraint < ActiveRecord::Migration[7.1]
  def up
    validate_check_constraint :users, name: "users_email_not_null"
    change_column_null :users, :email, false
    remove_check_constraint :users, name: "users_email_not_null"
  end
end
```

### Adding Indexes Safely

Use `CONCURRENTLY` to avoid locking:

```ruby
class AddIndexToOrdersUserId < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def change
    add_index :orders, :user_id, algorithm: :concurrently
  end
end
```

## Pre-Deployment Cleanup Scripts

For migrations that depend on data state (foreign keys, NOT NULL), include cleanup scripts in your PR description.

### Foreign Key Example

```ruby
# Run in production console BEFORE deploying:

# Find orphaned records
orphaned = Friendship.left_outer_joins(:user).where(users: { id: nil })
puts "Orphaned by user_id: #{orphaned.count}"

orphaned_by_friend = Friendship.left_outer_joins(:friend).where(friends_friendships: { id: nil })
puts "Orphaned by friend_id: #{orphaned_by_friend.count}"

# Clean up (in transaction for safety)
ActiveRecord::Base.transaction do
  orphaned.delete_all
  orphaned_by_friend.delete_all
end
```

### NOT NULL Example

```ruby
# Backfill nil values BEFORE adding NOT NULL:
User.where(email: nil).find_each do |user|
  user.update_columns(email: "unknown-#{user.id}@example.com")
end

# Verify
puts "Remaining nil emails: #{User.where(email: nil).count}"
```

## Renaming Patterns

### Renaming Columns

Use a three-phase approach:

1. Add new column, write to both
2. Backfill data, switch reads to new column
3. Remove old column (two-phase removal)

```ruby
# Phase 1
class AddNewColumnName < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :full_name, :string
  end
end

# In model during transition:
class User < ApplicationRecord
  def name=(value)
    self.full_name = value
    super  # Write to both during transition
  end
end

# Phase 2: Backfill
User.where(full_name: nil).find_each do |user|
  user.update_columns(full_name: user.name)
end

# Phase 3: Remove old column (two-phase)
```

### Renaming Tables

Similar approach—create new, migrate data, drop old.

## Common Migration Patterns

### Adding Foreign Keys

```ruby
class AddUserForeignKeyToOrders < ActiveRecord::Migration[7.1]
  def change
    # Add unvalidated first (fast, no lock)
    add_foreign_key :orders, :users, validate: false
  end
end

# Separate migration to validate
class ValidateUserForeignKeyOnOrders < ActiveRecord::Migration[7.1]
  def change
    validate_foreign_key :orders, :users
  end
end
```

### Removing Unused Tables

```ruby
class DropLegacyReportsTable < ActiveRecord::Migration[7.1]
  def up
    safety_assured { drop_table :legacy_reports }
  end

  def down
    # Include full schema for reversibility
    create_table :legacy_reports do |t|
      t.string :name
      t.timestamps
    end
  end
end
```

### Adding Columns with Defaults

```ruby
class AddStatusToOrders < ActiveRecord::Migration[7.1]
  def change
    # Modern PostgreSQL handles this without table lock
    add_column :orders, :status, :string, default: "pending", null: false
  end
end
```

## PR Description Template

For complex migrations, include in PR:

```markdown
## Pre-deployment steps

Run in production console before deploying:

\`\`\`ruby
# Verify/clean up data
orphaned = Model.where(foreign_key: nil)
puts "Found #{orphaned.count} orphaned records"
orphaned.delete_all if orphaned.count < 100  # Or handle appropriately
\`\`\`

## Rollback plan

If issues occur:
1. Revert the PR
2. Run: `rails db:rollback STEP=1`
```

## Quick Reference

| Operation | Safe Approach |
|-----------|---------------|
| Remove column | Two-phase: `ignored_columns` → drop |
| Add NOT NULL | Check constraint → validate → apply |
| Add index | `algorithm: :concurrently` |
| Add foreign key | Add unvalidated → validate separately |
| Rename column | Add new → backfill → remove old |

| Do | Avoid |
|----|-------|
| Two-phase column removal | Single-step column drops |
| Pre-deployment cleanup scripts | Assuming clean data |
| `safety_assured` with justification | Disabling Strong Migrations globally |
| Concurrent index creation | Blocking index adds on large tables |
| Document rollback plan | Assuming migrations always succeed |
