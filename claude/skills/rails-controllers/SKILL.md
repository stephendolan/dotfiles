---
name: rails-controllers
description: Rails controller patterns and REST conventions. Use when writing controllers, designing endpoints, or handling requests. Covers REST resources, thin controllers, authorization, and error handling.
---

# Rails Controllers

Patterns for clean, RESTful Rails controllers.

## Philosophy: Resources Over Custom Actions

Model web endpoints as REST resources. Introduce new resources rather than custom verbs.

### Custom Verbs → New Resources

```ruby
# Avoid - custom actions on resource
resources :cards do
  post :close
  post :reopen
  post :archive
end

# Prefer - new resources for state changes
resources :cards do
  resource :closure, only: [:create, :destroy]  # close/reopen
  resource :archival, only: [:create, :destroy]  # archive/unarchive
end
```

### Why Resources?

- CRUD actions map to standard HTTP methods (POST create, DELETE destroy)
- Controller stays focused on one resource
- Easier to test and reason about
- Follows Rails conventions

### Resource Controller Example

```ruby
# app/controllers/cards/closures_controller.rb
class Cards::ClosuresController < ApplicationController
  before_action :set_card

  def create
    @card.close!
    redirect_to @card
  end

  def destroy
    @card.reopen!
    redirect_to @card
  end

  private

  def set_card
    @card = Card.find(params[:card_id])
  end
end
```

## Thin Controllers, Rich Models

### Direct Active Record Is Fine

For simple operations, call Active Record directly:

```ruby
class CommentsController < ApplicationController
  def create
    @comment = @card.comments.create!(comment_params)
    redirect_to @card
  end

  def destroy
    @comment = @card.comments.find(params[:id])
    @comment.destroy!
    redirect_to @card
  end
end
```

### Domain Methods for Complex Behavior

When behavior is complex, create intention-revealing model methods:

```ruby
# Controller stays thin
class Cards::GoldnessesController < ApplicationController
  def create
    @card.gild  # Complex behavior hidden behind simple API
    redirect_to @card
  end
end

# Model encapsulates complexity
class Card < ApplicationRecord
  def gild
    transaction do
      update!(golden: true, gilded_at: Time.current)
      owner.award_badge(:gilder)
      notify_team_of_gilding
    end
  end
end
```

## Authorization Patterns

### Before Actions for Authorization

```ruby
class InvitesController < ApplicationController
  before_action :authorize_team_access
  before_action :authorize_invite_creation, only: [:create]

  def create
    @invite = @team.invites.create!(invite_params)
  end

  private

  def authorize_team_access
    @team = current_user.teams.find(params[:team_id])
  end

  def authorize_invite_creation
    head :forbidden unless @team.can_invite?(current_user)
  end
end
```

### Scoped Concerns for API Endpoints

```ruby
# app/controllers/concerns/current_user_scoped.rb
module CurrentUserScoped
  extend ActiveSupport::Concern

  included do
    before_action :require_current_user_scope
  end

  private

  def require_current_user_scope
    raise ActiveRecord::RecordNotFound if params[:user_id] != "current"
    @user = current_user
  end
end

# Usage - only allows /api/v2/users/current/contacts
class Api::V2::ContactsController < ApplicationController
  include CurrentUserScoped

  def index
    render json: @user.contacts
  end
end
```

## Parameter Handling

### Extract Parameter Methods

```ruby
class InvitesController < ApplicationController
  def create
    Invite.create!(
      email: email_param,
      invite_to_team: invite_to_team_param,
      team: @team
    )
  end

  private

  def email_param
    params.require(:email)
  end

  def invite_to_team_param
    ActiveModel::Type::Boolean.new.cast(params.require(:invite_to_team))
  end
end
```

### Boolean Parsing

Don't rely on presence for booleans:

```ruby
# Avoid - presence check
def invite_to_team?
  params[:invite_to_team].present?  # "false" is truthy!
end

# Prefer - explicit boolean casting
def invite_to_team?
  ActiveModel::Type::Boolean.new.cast(params[:invite_to_team])
end

# Or string comparison
def has_logged_in?
  params[:has_logged_in] == "true"
end
```

## Error Handling

### Rescue Specific Exceptions

```ruby
class ApplicationController < ActionController::Base
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable

  private

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end

  def unprocessable(exception)
    render json: { errors: exception.record.errors }, status: :unprocessable_entity
  end
end
```

### Custom Exception Classes

```ruby
# app/controllers/concerns/error_handling.rb
module ErrorHandling
  extend ActiveSupport::Concern

  included do
    rescue_from User::TeamEnrollment::InvalidEnrollment do |exception|
      render "errors/invalid_enrollment", status: :unprocessable_entity
    end

    rescue_from OauthConnection::EmailMismatchError do |exception|
      redirect_to sign_in_path, alert: exception.message
    end
  end
end
```

## Idempotent Endpoints

### POST That Returns Existing Resource

When creating something that might exist, return success either way:

```ruby
class InvitesController < ApplicationController
  def create
    existing = @team.invites.find_by(email: email_param)

    if existing
      @invite = existing
      @status = :already_invited
      render :create, status: :ok  # 200, not 201
    else
      @invite = @team.invites.create!(email: email_param)
      @status = :invited
      render :create, status: :created  # 201
    end
  end
end
```

## Controller Organization

### Standard Action Order

```ruby
class ItemsController < ApplicationController
  before_action :set_item, only: [:show, :edit, :update, :destroy]

  # Collection actions
  def index
  end

  def new
  end

  def create
  end

  # Member actions
  def show
  end

  def edit
  end

  def update
  end

  def destroy
  end

  private

  def set_item
    @item = Item.find(params[:id])
  end

  def item_params
    params.require(:item).permit(:name, :description)
  end
end
```

### Namespace for Nested Resources

```ruby
# app/controllers/cards/comments_controller.rb
class Cards::CommentsController < ApplicationController
  before_action :set_card

  def create
    @comment = @card.comments.create!(comment_params)
  end

  private

  def set_card
    @card = Card.find(params[:card_id])
  end
end
```

## API Controllers

### Consistent JSON Responses

```ruby
class Api::V2::BaseController < ApplicationController
  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "not_found" }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    render json: { errors: e.record.errors.as_json }, status: :unprocessable_entity
  end

  rescue_from ActionController::ParameterMissing do |e|
    render json: { error: "parameter_missing", parameter: e.param }, status: :bad_request
  end
end
```

## Quick Reference

| Pattern | Approach |
|---------|----------|
| Custom verbs (close, archive) | New resource (closure, archival) |
| Complex model behavior | Domain method on model |
| Simple CRUD | Direct Active Record calls |
| Boolean params | Explicit casting, not presence |
| Authorization | Before actions, scoped concerns |

| Do | Avoid |
|----|-------|
| REST resources for state changes | Custom actions on resources |
| Thin controllers, rich models | Business logic in controllers |
| Explicit boolean parsing | Truthy presence checks |
| Scoped concerns for API auth | Scattered authorization logic |
| Return existing on duplicate POST | Error on duplicate creation |
