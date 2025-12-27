---
name: javascript-tooling
description: Recommended JavaScript/TypeScript tooling stack. Use when setting up build tooling, linting, formatting, testing, or bundling. Covers Biome, oxlint, tsup, Vitest, and ESM configuration.
---

# JavaScript/TypeScript Tooling

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
npm install -D oxlint
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

Native ESM and TypeScript support, faster than Jest.

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

```json
{
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint src",
    "format": "biome format --write src",
    "format:check": "biome format src",
    "test": "vitest"
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

## Version Injection

Inject version at build time (already shown in tsup.config.ts above):

```typescript
declare const __VERSION__: string;
program.version(__VERSION__);
```

## DevDependencies

```json
{
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "oxlint": "^0.16.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```
