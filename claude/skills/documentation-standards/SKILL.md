---
name: documentation-standards
description: Best practices for project documentation including README, CONTRIBUTING, CHANGELOG, and Markdown files. Use when updating documentation, writing README sections, or maintaining project docs. Covers Markdown formatting, documentation structure, common sections, consistency patterns, and technical writing clarity.
allowed-tools: Read, Grep, Glob
---

This skill provides standards for creating and maintaining clear, consistent project documentation.

## Core Philosophy

**Documentation should be scannable, actionable, and maintainable.** Every section must justify its existence. Verbose documentation is rarely read documentation.

## File-Specific Standards

### README.md

**Essential sections** (in order):

1. **Title & Description** - What the project is (1-2 sentences)
2. **Installation** - How to get started (commands only, minimal prose)
3. **Usage** - Quick examples showing common use cases
4. **Configuration** - Key settings (if applicable)
5. **License** - License type and link

**Optional sections** (only if valuable):

- Contributing (link to CONTRIBUTING.md)
- API Reference (or link to docs)
- Troubleshooting (only common issues)

**Avoid**:

- Lengthy introductions
- Obvious explanations ("This section explains installation")
- Feature lists that duplicate code
- Badges without purpose

**Example structure**:

```markdown
# Project Name

Brief description of what this does and why it exists.

## Installation

Requires Node.js 18+

\`\`\`bash
npm install package-name
\`\`\`

## Usage

\`\`\`typescript
import { function } from 'package-name';

const result = function();
\`\`\`

## License

MIT
```

### CONTRIBUTING.md

**Essential sections**:

1. **Development Setup** - Commands to get development environment running
2. **Code Standards** - Link to linting config or style guide
3. **Testing** - How to run tests
4. **Pull Request Process** - What makes a good PR

**Keep it practical**:

```markdown
## Development Setup

\`\`\`bash
git clone repo
npm install
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

All tests must pass before merging.

## Pull Requests

- Keep PRs focused on a single change
- Include tests for new features
- Update documentation as needed
```

### CHANGELOG.md

**Follow Keep a Changelog format**:

```markdown
# Changelog

## [Unreleased]

### Added

- New feature description

### Changed

- Modified behavior description

### Fixed

- Bug fix description

## [1.0.0] - 2025-01-15

### Added

- Initial release
```

**Version ordering**: Newest first (top of file)

**Group changes**: Added, Changed, Deprecated, Removed, Fixed, Security

## Markdown Standards

### Headers

- **One H1** (`#`) per file - the title
- **Hierarchical** - Don't skip levels (H1 → H2 → H3, never H1 → H3)
- **Descriptive** - Headers should be scannable
- **No punctuation** - No periods at end of headers

```markdown
# Title ✅

## Installation ✅

### Prerequisites ✅

# Title. ❌ (no period)

# Title! ❌ (no exclamation)

### Skipped H2 ❌ (hierarchy broken)
```

### Code Blocks

**Always specify language** for syntax highlighting:

```markdown
\`\`\`typescript
const example = "code";
\`\`\`

\`\`\`bash
npm install
\`\`\`
```

**Inline code** for:

- File names: `package.json`
- Commands: `npm install`
- Variable names: `userId`
- Short code snippets: `const x = 5`

### Lists

**Consistent bullet style**:

- Use `-` for unordered lists
- Use `1.` for ordered lists
- Indent with 2 spaces for nested items

**Parallel structure** - Start all items with same grammar:

```markdown
✅ Good:

- Install dependencies
- Run the server
- Open browser

❌ Bad:

- Installing dependencies
- Run the server
- You should open a browser
```

### Links

**Descriptive link text** - Never "click here":

```markdown
✅ See [installation guide](link)
❌ Click [here](link) for installation
```

**Relative links** for internal docs:

```markdown
See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup.
```

## Technical Writing Clarity

### Active Voice

```markdown
✅ Run npm install to install dependencies
❌ Dependencies can be installed by running npm install
```

### Imperative Mood

```markdown
✅ Install the package with npm
✅ Configure the API key in .env
❌ You should install the package
❌ The API key should be configured
```

### Concise Sentences

**Cut filler words**:

- ❌ "In order to" → ✅ "To"
- ❌ "It is important to note that" → ✅ (delete entirely)
- ❌ "This section will explain" → ✅ (delete entirely)

**One idea per sentence**:

```markdown
✅ Install Node.js 18 or higher. Then run npm install.

❌ You need to install Node.js version 18 or higher, and after that's
done, you can proceed to run the npm install command.
```

## Code Examples

**Make examples runnable**:

- Complete, not fragments
- Use realistic variable names
- Show expected output when helpful

```markdown
✅ Complete example:
\`\`\`typescript
import { createUser } from './api';

const user = await createUser({
email: 'user@example.com',
name: 'Jane Smith'
});
// Returns: { id: '123', email: 'user@example.com', name: 'Jane Smith' }
\`\`\`

❌ Fragment:
\`\`\`typescript
createUser(...)
\`\`\`
```

## Configuration Documentation

**Show examples, not just descriptions**:

```markdown
✅ Good:
\`\`\`json
{
"timeout": 5000, // Request timeout in milliseconds
"retries": 3 // Number of retry attempts
}
\`\`\`

❌ Verbose:
The `timeout` configuration option controls how long the system
will wait before timing out a request. It is specified in milliseconds.
The default value is 5000 milliseconds.
```

## Common Documentation Issues

**Missing prerequisites**:

```markdown
❌ Run npm install
✅ Requires Node.js 18+

    npm install
```

**Outdated examples**:

- Verify code examples actually work
- Update when APIs change
- Test commands in fresh environment

**Broken links**:

- Check internal links exist
- Verify external links are current
- Use relative paths for project files

**Inconsistent formatting**:

- Pick one style for code blocks, lists, headers
- Use consistent terminology throughout
- Match existing project documentation style

## API Documentation

**Consistent structure for functions**:

```markdown
### functionName(param1, param2)

Brief description of what it does.

**Parameters:**

- `param1` (string) - Description
- `param2` (number, optional) - Description

**Returns:** Description of return value

**Example:**
\`\`\`typescript
const result = functionName('value', 42);
\`\`\`
```

## Maintenance Checklist

When updating documentation:

- [ ] Headers follow hierarchy (H1 → H2 → H3)
- [ ] Code blocks specify language
- [ ] Links are not broken
- [ ] Examples are tested and working
- [ ] Consistent terminology throughout
- [ ] No typos or grammar errors
- [ ] Active voice and imperative mood
- [ ] Concise, scannable sections
- [ ] Prerequisites clearly stated

## When to Launch documentation-updater Agent

Use the agent for:

- Comprehensive documentation audits across multiple files
- Large-scale consistency updates
- Cross-reference verification
- Package documentation synchronization

Use this skill for:

- Single file updates
- Adding new sections to existing docs
- Fixing typos or broken links
- Writing new documentation sections

## Remember

- **Scannable beats comprehensive** - Walls of text don't get read
- **Show don't tell** - Examples over explanations
- **Active and imperative** - "Run the command" not "The command can be run"
- **Test everything** - Code examples must work
- **Consistent terminology** - Pick one term and stick with it
- **Hierarchy matters** - Headers should be properly nested
- **Concise beats verbose** - Cut unnecessary words

Documentation is for the reader, not the writer. Make it easy to find what they need and get back to work.
