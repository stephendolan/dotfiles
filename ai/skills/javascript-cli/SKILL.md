---
name: javascript-cli
description: Build TypeScript CLIs with Commander.js, JSON output, keychain auth, and consistent architecture. Use when creating new CLIs, adding commands, or wrapping APIs. Covers project structure, API clients, error handling, output formatting, and authentication patterns.
---

# JavaScript/TypeScript CLI Development

Build CLIs that feel like first-class developer tools. Apply this skill when creating command-line interfaces that wrap APIs or system integrations.

**Prerequisite**: Apply the `javascript-tooling` skill for build tooling (tsup, Biome, oxlint, Vitest, bun).

## Philosophy

**JSON-First Output.** CLIs are integration points. Output JSON so users can pipe to `jq`, parse in scripts, or feed to other tools. Human-readable output limits composability—users who want pretty output can pipe through `jq`.

**Single Source of Truth.** One API client class handles all requests. One auth manager handles credentials. One output function formats responses. This consistency means bugs get fixed once and behavior stays predictable.

**Fail Loudly with Context.** Errors should be machine-parseable JSON with enough detail to diagnose. Redact secrets but preserve structure. Exit with appropriate codes so scripts can react.

**Secure by Default.** Store credentials in OS keychain, where they're protected by the system. Accept env vars as fallback but warn users—environment variables can leak to child processes and logs.

**Commands Mirror Resources.** Structure commands around API resources: `mycli users list`, `mycli accounts view`. Users can guess commands without reading docs because the CLI mirrors the mental model of the API.

## Project Structure

```
my-cli/
├── src/
│   ├── cli.ts              # Entry point, command registration
│   ├── commands/           # One file per resource
│   │   ├── auth.ts
│   │   └── users.ts
│   ├── lib/
│   │   ├── api-client.ts   # Single API wrapper class
│   │   ├── auth.ts         # Keychain + env var auth
│   │   ├── config.ts       # Local settings (conf package)
│   │   ├── output.ts       # JSON formatting
│   │   ├── errors.ts       # Error handling + redaction
│   │   ├── command-utils.ts# withErrorHandling, requireConfirmation
│   │   └── dates.ts        # Date parsing with dayjs
│   └── types/
│       └── index.ts
├── package.json
├── tsup.config.ts
└── biome.json
```

## Entry Point Pattern

Capture global flags via Commander's `preAction` hook before commands run:

```typescript
#!/usr/bin/env bun
import { Command } from 'commander';
import { setOutputOptions } from './lib/output.js';
import { createUsersCommand } from './commands/users.js';

declare const __VERSION__: string;

const program = new Command();

program
  .name('mycli')
  .description('CLI for MyService API')
  .version(__VERSION__)
  .option('-c, --compact', 'Minified JSON output')
  .hook('preAction', (thisCommand) => {
    setOutputOptions({ compact: thisCommand.opts().compact });
  });

program.addCommand(createAuthCommand());
program.addCommand(createUsersCommand());
program.parse();
```

## Command Pattern

Each command file exports a factory function. The `withErrorHandling` wrapper catches exceptions, formats them as JSON, and exits non-zero:

```typescript
import { Command } from 'commander';
import { client } from '../lib/api-client.js';
import { outputJson } from '../lib/output.js';
import { withErrorHandling, requireConfirmation } from '../lib/command-utils.js';

export function createUsersCommand(): Command {
  const cmd = new Command('users').description('User operations');

  cmd.command('list')
    .option('-l, --limit <n>', 'Limit results', '50')
    .action(withErrorHandling(async (options) => {
      const users = await client.getUsers({ limit: Number(options.limit) });
      outputJson(users);
    }));

  cmd.command('view')
    .argument('<id>', 'User ID')
    .action(withErrorHandling(async (id) => {
      const user = await client.getUser(id);
      outputJson(user);
    }));

  cmd.command('delete')
    .argument('<id>', 'User ID')
    .option('-y, --yes', 'Skip confirmation')
    .action(withErrorHandling(async (id, options) => {
      requireConfirmation('user', options.yes);
      await client.deleteUser(id);
      outputJson({ deleted: id });
    }));

  return cmd;
}
```

## API Client Pattern

Route all API calls through a single client class. This centralizes auth header injection, error handling, and response processing:

```typescript
export class MyClient {
  private baseUrl = 'https://api.myservice.com/v1';

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await auth.getAccessToken() || process.env.MY_API_KEY;
    if (!token) throw new MyCliError('Not authenticated. Run: mycli auth login', 401);
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async getUsers(params?: { limit?: number }) {
    const query = params?.limit ? `?limit=${params.limit}` : '';
    const response = await fetch(`${this.baseUrl}/users${query}`, {
      headers: await this.getHeaders(),
    });
    if (!response.ok) throw await this.handleError(response);
    return response.json();
  }

  async getUser(id: string) {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      headers: await this.getHeaders(),
    });
    if (!response.ok) throw await this.handleError(response);
    return response.json();
  }
}

export const client = new MyClient();
```

## Authentication Pattern

Keychain storage via @napi-rs/keyring with environment variable fallback:

```typescript
import { Entry } from '@napi-rs/keyring';

const SERVICE = 'my-cli';
const ACCOUNT = 'access-token';

export class AuthManager {
  async getAccessToken(): Promise<string | null> {
    try {
      return new Entry(SERVICE, ACCOUNT).getPassword();
    } catch {
      return null;
    }
  }

  async setAccessToken(token: string): Promise<void> {
    new Entry(SERVICE, ACCOUNT).setPassword(token);
  }

  async deleteAccessToken(): Promise<boolean> {
    try {
      return new Entry(SERVICE, ACCOUNT).deletePassword();
    } catch {
      return false;
    }
  }
}

export const auth = new AuthManager();
```

## Error Handling Pattern

Structured JSON errors with secret redaction:

```typescript
export class MyCliError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'MyCliError';
  }
}

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[\w\-._~+/]+=*/gi, '[REDACTED]')
    .replace(/api[_-]?key[=:]\s*[\w\-._~+/]+=*/gi, '[REDACTED]');
}

export function handleApiError(error: unknown): never {
  const detail = error instanceof Error ? sanitizeErrorMessage(error.message) : 'Unknown error';
  const statusCode = error instanceof MyCliError ? error.statusCode : 1;
  outputJson({ error: { name: 'api_error', detail, statusCode } });
  process.exit(1);
}
```

## Output Pattern

Global options with domain-specific transforms:

```typescript
let globalOptions: OutputOptions = {};

export function setOutputOptions(options: OutputOptions): void {
  globalOptions = options;
}

export function outputJson(data: unknown): void {
  // Apply domain transforms here (currency conversion, HTML stripping, etc.)
  const json = globalOptions.compact
    ? JSON.stringify(data)
    : JSON.stringify(data, null, 2);
  console.log(json);
}
```

## Conventions Reference

| Concern | Pattern |
|---------|---------|
| List commands | Return arrays directly: `[{...}, {...}]` |
| Destructive actions | Require `--yes` flag |
| Default resource ID | Config → flag → env var |
| Credentials | Keychain → env var (with warning) |
| Date input | Flexible formats via dayjs, store as ISO |
| Global flags | `--compact` for minified JSON |
| Error shape | `{ error: { name, detail, statusCode } }` |

## Correct Patterns

| Instead of | Use |
|------------|-----|
| `{ data: users, meta: {...} }` | `users` (array directly) |
| `console.log("Created user")` | `outputJson({ created: id })` |
| `fetch()` in command handler | `client.createUser()` |
| Token in `~/.myclirc` | `@napi-rs/keyring` |
| Silent catch returning `null` | Throw structured error |
| `{ message: "..." }` | `{ error: { name, detail, statusCode } }` |

## Domain Transforms

When APIs have quirks, add recursive transforms in output.ts:

| Domain | Transform |
|--------|-----------|
| Currency (YNAB) | Milliunits → dollars: `amount / 1000` |
| HTML content (HelpScout) | Strip to plain text |
| HAL responses | Remove `_links`, `_embedded` |
| Person objects | Compute `name` from `first` + `last` |

## Dependencies

```json
{
  "dependencies": {
    "@napi-rs/keyring": "^1.1.0",
    "commander": "^12.0.0",
    "conf": "^13.0.0",
    "dayjs": "^1.11.0",
    "dotenv": "^16.0.0"
  }
}
```

## Testing Focus

Test the boundaries, not the happy path:

```typescript
// Error sanitization: secrets get redacted
expect(sanitizeErrorMessage('Bearer abc123')).toBe('[REDACTED]');

// Domain transforms: amounts convert correctly
expect(convertMilliunits({ amount: 50000 })).toEqual({ amount: 50 });

// Auth fallback: keyring checked before env var
```

Provide a reset function for keyring state in tests:

```typescript
export function resetKeyringForTesting(): void {
  keyring = undefined;
}
```

## Auth Command Template

```typescript
export function createAuthCommand(): Command {
  const cmd = new Command('auth').description('Authentication');

  cmd.command('login')
    .argument('<api-key>', 'Your API key')
    .action(withErrorHandling(async (apiKey) => {
      await auth.setAccessToken(apiKey);
      outputJson({ status: 'authenticated' });
    }));

  cmd.command('logout')
    .action(withErrorHandling(async () => {
      await auth.deleteAccessToken();
      outputJson({ status: 'logged_out' });
    }));

  cmd.command('status')
    .action(withErrorHandling(async () => {
      outputJson({ authenticated: await auth.isAuthenticated() });
    }));

  return cmd;
}
```
