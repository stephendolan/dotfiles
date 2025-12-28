---
name: javascript-tooling
description: Recommended JavaScript/TypeScript tooling stack. Use when setting up build tooling, linting, formatting, testing, or bundling. Covers Biome, oxlint, tsup, Vitest, bun runtime, and ESM configuration.
---

# JavaScript/TypeScript Tooling

## Runtime: Bun

Use bun as the default JavaScript runtime. It runs TypeScript natively, installs packages faster than npm/yarn, and avoids version manager complexity. For CLI projects, use `#!/usr/bin/env bun` shebang.

## Recommended Stack

### Formatting: Biome

Faster than Prettier, zero-config defaults.

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "include": ["src/**/*.ts"], "ignore": ["dist", "node_modules"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "es5" } }
}
```

### Linting: oxlint

50-100x faster than ESLint, written in Rust.

```bash
bun add -D oxlint
```

```json
"lint": "oxlint src"
```

No config file needed - sensible defaults. For customization, use `oxlintrc.json`.

### Bundling: tsup

Wraps esbuild with sensible defaults. Zero-config for most cases.

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: true,
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
  },
});
```

### Testing: Vitest

Faster than Jest with native ESM and TypeScript support.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

## Package.json Scripts

Use `bun run` for all scripts:

```json
{
  "scripts": {
    "dev": "bun run src/cli.ts",
    "build": "bun run tsup",
    "typecheck": "bun run tsc --noEmit",
    "lint": "oxlint src",
    "format": "biome format --write src",
    "format:check": "biome format src",
    "test": "bun run vitest",
    "link": "bun run build && bun link"
  }
}
```

## ESM Configuration

Prefer ESM over CommonJS:

```json
{
  "type": "module",
  "exports": "./dist/index.js",
  "main": "./dist/index.js"
}
```

Use `.js` extensions in imports even for TypeScript:

```typescript
import { foo } from './utils.js';
```

## DevDependencies

```json
{
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "oxlint": "^0.16.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

## GitHub Actions

Use `oven-sh/setup-bun@v2` for CI. For npm publishing, also set up node:

```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- run: bun install
- run: bun run typecheck
- run: bun run lint
- run: bun test
- run: bun run build

# For npm publish step, also need node
- uses: actions/setup-node@v6
  with:
    node-version: '24'
    registry-url: 'https://registry.npmjs.org'

- run: npm publish --provenance --access public
```

With `id-token: write` permission and `--provenance`, npm uses OIDC for authentication (no `NPM_TOKEN` needed).
