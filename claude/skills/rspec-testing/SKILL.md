---
name: rspec-testing
description: RSpec testing patterns for Ruby and Rails. Use when writing tests, reviewing test code, or discussing testing strategy. Covers structure, naming, matchers, and external service stubbing.
---

# RSpec Testing Patterns

Patterns for clear, maintainable tests that document behavior.

## Philosophy: Test Behavior, Not Implementation

Tests should describe what users or external observers expect, not internal mechanics.

```ruby
# Good - tests observable behavior
it "shows the order confirmation" do
  visit order_path(order)
  expect(page).to have_content "Order confirmed"
end

# Avoid - tests internal implementation
it "calls the OrderConfirmationService" do
  expect(OrderConfirmationService).to receive(:new).with(order)
  # ...
end
```

## Flat Structure Over Nested Contexts

### Prefer Flat, Descriptive Tests

Each test should be independent with explicit setup:

```ruby
# Preferred - flat, self-documenting
it "redirects to dashboard when user is admin" do
  sign_in create(:user, :admin)
  get root_path
  expect(response).to redirect_to(dashboard_path)
end

it "redirects to home when user is not admin" do
  sign_in create(:user)
  get root_path
  expect(response).to redirect_to(home_path)
end
```

### Avoid Deep Nesting

```ruby
# Avoid - nested contexts with implicit setup
describe "GET /" do
  context "when user is signed in" do
    before { sign_in user }

    context "when user is admin" do
      let(:user) { create(:user, :admin) }

      it "redirects to dashboard" do
        get root_path
        expect(response).to redirect_to(dashboard_path)
      end
    end

    context "when user is not admin" do
      let(:user) { create(:user) }
      # ...
    end
  end
end
```

### Benefits of Flat Tests

- Each test can be read and understood in isolation
- Easier to debug failures
- No hidden setup in parent contexts
- Test names fully describe the scenario

## Test Naming

### Describe Observable Outcomes

```ruby
# Good - describes what user sees
it "displays call times in local timezone"
it "returns the call URL owned by the user"
it "creates a friendship between the users"

# Avoid - describes implementation details
it "sets the user and team during initialization"
it "calls the broadcast method after save"
```

### Include Conditions in Name

```ruby
# Good - condition is part of the name
it "redirects to dashboard when user is admin"
it "returns 404 when call URL does not exist"
it "sends welcome email after user confirms"

# Avoid - condition hidden in context
context "when admin" do
  it "redirects to dashboard"  # Missing context in name
end
```

## Explicit Setup

### Setup Within Each Test

```ruby
# Preferred - explicit setup
it "sends notification when comment is created" do
  user = create(:user)
  post = create(:post, author: user)

  expect {
    create(:comment, post: post, author: user)
  }.to have_enqueued_job(NotificationJob).with(user)
end
```

### Use `let` for Shared Simple Values

```ruby
# OK for simple, universally-needed values
let(:team) { create(:team) }
let(:user) { create(:user, team: team) }

# But prefer explicit setup for test-specific data
it "allows team owner to invite" do
  owner = create(:user, team: team, role: :owner)  # Explicit: this test needs an owner
  # ...
end
```

## Custom Matchers for Domain Concepts

Create matchers that express domain language:

```ruby
# Custom matcher
RSpec::Matchers.define :have_published_event do |event_type, data|
  match do |block|
    events = []
    allow(EventPublisher).to receive(:publish) { |type, payload| events << [type, payload] }
    block.call
    events.any? { |type, payload| type == event_type && payload >= data }
  end
end

# Usage - reads like requirements
expect {
  create(:subscription, user: user, plan: plan)
}.to have_published_event(
  "subscription.created",
  { user_id: user.id, plan_id: plan.id }
)
```

## External Service Stubbing

### VCR for Real API Interactions

Record and replay actual API responses:

```ruby
it "fetches user profile from GitHub", :vcr do
  profile = GithubService.fetch_profile("username")
  expect(profile.name).to eq "Expected Name"
end
```

When upgrading APIs, re-record cassettes with new version.

### WebMock for Controlled Stubbing

```ruby
it "sends webhook to external service" do
  stub = stub_request(:post, "https://api.example.com/webhooks")
    .with(
      body: { event: "user.created", user_id: 1 }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    .to_return(status: 200)

  WebhookService.notify_user_created(user)

  expect(stub).to have_been_requested
end
```

### Prefer Real Objects Over Doubles

```ruby
# Good - uses real objects
it "sends welcome email" do
  user = create(:user)
  user.send_welcome_email
  expect(ActionMailer::Base.deliveries.last.to).to include(user.email)
end

# Use doubles only for external services
it "charges the card" do
  allow(Stripe::Charge).to receive(:create).and_return(mock_charge)
  # ...
end
```

## Testing Side Effects

### Use `change` Matcher

```ruby
it "creates a user favorite" do
  expect {
    create(:friendship, user: user, friend: other_user)
  }.to change(UserFavorite, :count).by(1)
end
```

### Verify Created Records

```ruby
it "creates friendship with correct attributes" do
  expect {
    create(:friendship, user: user, friend: other_user)
  }.to change(Friendship, :count).by(1)

  expect(Friendship.last).to have_attributes(
    user_id: user.id,
    friend_id: other_user.id
  )
end
```

### Test Job Enqueuing

```ruby
it "enqueues notification job when user is soft-deleted" do
  expect {
    user.update!(deleted_at: Time.current)
  }.to have_enqueued_job(NotifyTeamJob).with(user.team)
end
```

## Quick Reference

| Do | Avoid |
|----|-------|
| Flat, self-contained tests | Deeply nested contexts |
| Test names describe full scenario | Context-dependent names |
| Explicit setup in each test | Hidden setup in parent `before` blocks |
| Test observable behavior | Test implementation details |
| Custom matchers for domain concepts | Complex inline expectations |
| VCR for external API recording | Fragile manual stubs for APIs |
| Real objects where practical | Excessive mocking |
