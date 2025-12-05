---
name: rails-jobs
description: Rails background job patterns for Sidekiq/ActiveJob. Use when creating jobs, handling job errors, or debugging async issues. Covers thin jobs, error strategies, and naming conventions.
---

# Rails Background Jobs

Patterns for reliable, maintainable background jobs.

## Philosophy: Keep Jobs Thin

Jobs handle job-specific concerns (enqueuing, retries, serialization). Business logic lives in domain models.

```ruby
# Good - job delegates to model
class ProcessOrderJob < ApplicationJob
  def perform(order_id)
    order = Order.find(order_id)
    order.process!  # Business logic in the model
  end
end

# Avoid - business logic in job
class ProcessOrderJob < ApplicationJob
  def perform(order_id)
    order = Order.find(order_id)
    order.update!(status: "processing")
    PaymentService.charge(order.user, order.total)
    order.update!(status: "completed")
    OrderMailer.confirmation(order).deliver_later
  end
end
```

## The `_later` / `_now` Convention

Use `_later` suffix for async methods, `_now` for synchronous:

```ruby
module Event::Relaying
  extend ActiveSupport::Concern

  included do
    after_create_commit :relay_later
  end

  def relay_later
    Event::RelayJob.perform_later(self)
  end

  def relay_now
    # Actual relay logic here
    EventService.broadcast(self)
  end
end

class Event::RelayJob < ApplicationJob
  def perform(event)
    event.relay_now
  end
end
```

This pattern:
- Makes async behavior explicit at call sites
- Allows synchronous execution in tests or console
- Follows Rails conventions (ActionMailer's `deliver_later`)

## Error Handling Strategy

### `discard_on` for Permanent Failures

Use `discard_on` when retrying won't help:

```ruby
class UserEnrichmentJob < ApplicationJob
  # Quota exceeded - retrying won't help
  discard_on RestClient::PaymentRequired

  # Record deleted during processing
  discard_on ActiveJob::DeserializationError

  # Invalid credentials
  discard_on RestClient::Unauthorized

  def perform(user_id)
    user = User.find(user_id)
    EnrichmentService.enrich(user)
  end
end
```

### `retry_on` for Transient Failures

Use `retry_on` for temporary issues:

```ruby
class ExternalApiJob < ApplicationJob
  # Service temporarily down
  retry_on RestClient::ServiceUnavailable, wait: 1.minute, attempts: 3

  # Rate limited - wait and retry
  retry_on RestClient::TooManyRequests, wait: :polynomially_longer, attempts: 5

  # Timeout - might work next time
  retry_on Timeout::Error, wait: 30.seconds, attempts: 3

  def perform(resource_id)
    # ...
  end
end
```

### Log When Discarding

Always log for visibility when discarding jobs:

```ruby
class WebhookProcessingJob < ApplicationJob
  discard_on(ActiveRecord::RecordNotFound) do |job, error|
    Rails.logger.info "Discarding #{job.class}: #{error.message}"
  end

  discard_on(RestClient::PaymentRequired) do |job, error|
    Rails.logger.warn "API quota exceeded for #{job.arguments.first}: #{error.message}"
  end
end
```

## Serialization Gotchas

### Arguments Become JSON

ActiveJob serializes arguments to JSON. Watch for:

```ruby
# Symbols become strings
MyJob.perform_later(status: :active)
# In perform: options["status"] == "active" (string, not symbol)

# Use string keys or convert explicitly
def perform(options)
  status = options["status"].to_sym
end
```

### StringInquirer Issues

Rails environment is a `StringInquirer`, not a plain string:

```ruby
# This can fail in Sidekiq
MyJob.perform_later(env: Rails.env)  # StringInquirer doesn't serialize

# Convert to string first
MyJob.perform_later(env: Rails.env.to_s)
```

### Handle Missing Records

Records may be deleted between enqueue and perform:

```ruby
class NotificationJob < ApplicationJob
  # Option 1: Discard gracefully
  discard_on ActiveJob::DeserializationError

  # Option 2: Handle in perform
  def perform(user_id)
    user = User.find_by(id: user_id)
    return if user.nil?  # Record was deleted

    NotificationService.send(user)
  end
end
```

## Job Organization

### Naming Conventions

```ruby
# Verb + Noun + Job
ProcessOrderJob
SendWelcomeEmailJob
SyncStripeCustomerJob
RefreshMaterializedViewJob

# Namespaced for related jobs
module Scheduled
  class DailyReportJob < ApplicationJob; end
  class WeeklyCleanupJob < ApplicationJob; end
end
```

### Thin Scheduled Jobs

Scheduled jobs should delegate to query objects or services:

```ruby
class Scheduled::MonitorSidekiqJob < ApplicationJob
  def perform
    stats = SidekiqMonitoring.queue_stats
    Rails.logger.info stats.merge(tags: ["sidekiq", "monitoring"])
  end
end

# Logic lives in module, not job
module SidekiqMonitoring
  def self.queue_stats
    {
      enqueued: Sidekiq::Stats.new.enqueued,
      scheduled: Sidekiq::Stats.new.scheduled_size,
      busy: Sidekiq::ProcessSet.new.total_concurrency
    }
  end
end
```

## Common Patterns

### Batch Operations

Move expensive work off the request path:

```ruby
# Before: N jobs in webhook handler (timeout risk)
users.find_each do |user|
  NotifyUserJob.perform_later(user)
end

# After: Single job, batch in background
NotifyTeamJob.perform_later(team_id: team.id)

class NotifyTeamJob < ApplicationJob
  def perform(team_id:)
    team = Team.find(team_id)
    team.users.find_each do |user|
      NotifyUserJob.perform_now(user)
    end
  end
end
```

### Idempotent Jobs

Design jobs to be safely retried:

```ruby
class FulfillOrderJob < ApplicationJob
  def perform(order_id)
    order = Order.find(order_id)

    # Guard against duplicate processing
    return if order.fulfilled?

    order.fulfill!
  end
end
```

## Quick Reference

| Scenario | Strategy |
|----------|----------|
| Quota/payment exceeded | `discard_on` |
| Invalid credentials | `discard_on` |
| Record deleted | `discard_on DeserializationError` |
| Service unavailable | `retry_on` with backoff |
| Rate limited | `retry_on` with polynomial wait |
| Timeout | `retry_on` with limited attempts |

| Do | Avoid |
|----|-------|
| Keep jobs thin, delegate to models | Business logic in jobs |
| Use `_later`/`_now` naming | Inconsistent async naming |
| Log when discarding | Silent discards |
| Convert types before enqueue | Assume serialization preserves types |
| Design for idempotency | Assume exactly-once delivery |
