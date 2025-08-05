# /verify - Repository Verification Command

Perform a comprehensive verification of the repository to ensure it's ready to push. This verification process is optimized for TypeScript and Ruby projects but adapts to any repository.

## Verification Steps

1. **Discover Project Type and Tools**

   **TypeScript/JavaScript Projects:**
   - Check for package.json and lock files (package-lock.json, yarn.lock, pnpm-lock.yaml)
   - Identify package manager (npm, yarn, pnpm)
   - Check for tsconfig.json (TypeScript)
   - Check for .eslintrc*, .prettierrc*, biome.json
   - Check for jest.config._, vitest.config._, or test scripts

   **Ruby Projects:**
   - Check for Gemfile and Gemfile.lock
   - Check for .rubocop.yml, .reek.yml, .fasterer.yml
   - Check for Rakefile
   - Check for spec/ or test/ directories
   - Check for .rspec or test/test_helper.rb

2. **Run Tests**

   **TypeScript/JavaScript:**
   - npm/yarn/pnpm test
   - npm/yarn/pnpm test:unit and test:integration if available
   - npm/yarn/pnpm test:e2e if available
   - Check coverage thresholds if configured

   **Ruby:**
   - bundle exec rspec
   - bundle exec rake test or rake spec
   - bundle exec rails test (for Rails apps)
   - bundle exec minitest if using Minitest

3. **Run Build/Compile**

   **TypeScript/JavaScript:**
   - npm/yarn/pnpm build
   - npm/yarn/pnpm compile if available
   - tsc --noEmit for type checking only

   **Ruby:**
   - bundle exec rake assets:precompile (Rails)
   - Check for any custom build tasks in Rakefile

4. **Run Linters and Formatters**

   **TypeScript/JavaScript:**
   - npm/yarn/pnpm lint
   - npx eslint . --fix (if no lint script)
   - npx prettier --check . (if configured)
   - npx biome check (if using Biome)

   **Ruby:**
   - bundle exec rubocop
   - bundle exec rubocop -a (auto-fix safe issues)
   - bundle exec standardrb if using Standard
   - bundle exec reek if configured
   - bundle exec fasterer if configured

5. **Check Type Safety**

   **TypeScript:**
   - npm/yarn/pnpm typecheck or tsc
   - tsc --noEmit if no typecheck script
   - Check for @ts-ignore or @ts-expect-error comments

   **Ruby:**
   - bundle exec srb tc (if using Sorbet)
   - bundle exec steep check (if using Steep)

6. **Ruby-Specific Checks**
   - bundle exec rails db:migrate:status (ensure migrations are up to date)
   - bundle exec brakeman (security scanning for Rails)
   - bundle exec bundle-audit check (check for vulnerable gems)
   - bundle exec license_finder (if configured)

7. **TypeScript-Specific Checks**
   - Check for unused dependencies with depcheck
   - Validate package.json with npm/yarn/pnpm audit
   - Check for circular dependencies if configured

8. **Examine CI/CD Configuration**
   - Check .github/workflows/\*.yml for GitHub Actions
   - Check .gitlab-ci.yml for GitLab CI
   - Check .circleci/config.yml for CircleCI
   - Extract and run all verification commands found in CI files
   - Pay special attention to matrix builds (different Node/Ruby versions)

9. **Run All CI Steps Locally**
   - For each step found in CI configuration, attempt to run it locally
   - Skip deployment or release steps
   - Focus on test, build, lint, and quality check steps

## Execution Order

1. **Initial Discovery**
   - Identify project type (TypeScript, Ruby, or both)
   - Check for monorepo structure (lerna.json, workspace configuration)
   - Identify package manager and dependency manager

2. **Dependency Check**
   - npm/yarn/pnpm install (TypeScript)
   - bundle install (Ruby)
   - Ensure lock files are up to date

3. **Quality Checks** (run in parallel where possible)
   - Linting and formatting
   - Type checking
   - Security audits

4. **Build Steps**
   - Compile TypeScript
   - Precompile assets (Rails)

5. **Test Execution**
   - Unit tests
   - Integration tests
   - E2E tests (if quick enough)

6. **CI Verification**
   - Run any additional CI-specific commands locally

## Important Notes

- For TypeScript projects, prefer the package manager with a lock file present
- For Ruby projects, always use `bundle exec` to ensure correct gem versions
- Check both README.md and CLAUDE.md for project-specific commands
- Continue running all checks even if one fails to get a complete picture
- For monorepos, run verification in each package/workspace
- Pay attention to .nvmrc or .ruby-version for correct runtime versions

## Common Scripts to Check

**TypeScript/JavaScript package.json:**

```json
"test", "test:unit", "test:integration", "test:e2e",
"lint", "lint:fix", "format", "format:check",
"typecheck", "type-check", "tsc",
"build", "compile", "bundle"
```

**Ruby Rakefile tasks:**

```ruby
rake -T | grep -E "(spec|test|rubocop|lint|audit)"
```

## Success Criteria

The repository is ready to push when:

- All tests pass (including coverage thresholds if set)
- All builds complete successfully
- All linters pass with no errors (warnings are acceptable but should be noted)
- All type checks pass (TypeScript)
- No security vulnerabilities in dependencies
- All CI verification steps that can be run locally pass
- Database migrations are up to date (Rails)

## Failure Handling

When a check fails:

1. Report the specific failure with context
2. Offer to fix auto-fixable issues (formatting, safe rubocop fixes)
3. For test failures, offer to investigate the specific failing tests
4. Continue running remaining checks unless critically blocked
5. Provide a summary of all issues found at the end
