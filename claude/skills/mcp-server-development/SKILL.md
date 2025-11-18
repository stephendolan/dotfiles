---
name: mcp-server-development
description: Expert guidance for building MCP (Model Context Protocol) servers using the TypeScript SDK. Use when developing MCP servers, implementing tools/resources/prompts, or working with the @modelcontextprotocol/sdk package. Covers server initialization, request handlers, zod schemas, error handling, and JSON-RPC patterns.
allowed-tools: Read, Grep, Glob, WebFetch
---

This skill provides expert guidance for developing MCP servers using the TypeScript SDK, following protocol specifications and best practices.

## Core Stack

- **Package**: `@modelcontextprotocol/sdk`
- **Protocol**: JSON-RPC 2.0 over stdio or SSE transport
- **Validation**: Zod schemas for type safety
- **Language**: TypeScript with strict mode

## Server Initialization Pattern

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "server-name",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // If implementing tools
      resources: {}, // If implementing resources
      prompts: {}, // If implementing prompts
    },
  },
);
```

**Critical**: Only declare capabilities you actually implement.

## Tool Implementation Pattern

### List Tools Handler

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "tool_name",
      description: "Clear, actionable description of what this tool does",
      inputSchema: {
        type: "object",
        properties: {
          param: {
            type: "string",
            description: "Specific parameter description",
          },
        },
        required: ["param"],
      },
    },
  ],
}));
```

### Call Tool Handler

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "tool_name") {
    const args = request.params.arguments as { param: string };

    try {
      const result = await performOperation(args.param);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Operation failed: ${error.message}`,
      );
    }
  }

  throw new McpError(
    ErrorCode.MethodNotFound,
    `Unknown tool: ${request.params.name}`,
  );
});
```

## Error Handling

**ALWAYS use McpError** for protocol-compliant errors:

```typescript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

// Common error codes:
ErrorCode.InvalidRequest; // Malformed request
ErrorCode.MethodNotFound; // Unknown tool/resource/prompt
ErrorCode.InvalidParams; // Bad parameters
ErrorCode.InternalError; // Server-side failures
```

**Never let exceptions bubble** - catch and convert to McpError with meaningful messages.

## Input Validation

Use zod for runtime validation:

```typescript
import { z } from "zod";

const ToolArgsSchema = z.object({
  param: z.string().min(1),
  optional: z.number().optional(),
});

// In handler:
const args = ToolArgsSchema.parse(request.params.arguments);
```

## Resource Implementation Pattern

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "resource://path/to/resource",
      name: "Resource Name",
      description: "What this resource provides",
      mimeType: "application/json", // or text/plain, etc.
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "resource://path/to/resource") {
    const data = await fetchResourceData();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data),
        },
      ],
    };
  }

  throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
});
```

## Transport Setup

```typescript
// Stdio transport (most common for Claude Desktop):
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
```

## Best Practices

**Tool Descriptions**:

- Be specific and actionable
- Explain what the tool does, not how it works
- Include example use cases in documentation

**Parameter Schemas**:

- Use descriptive property names
- Always include descriptions for parameters
- Mark optional parameters explicitly
- Validate thoroughly with zod

**Error Messages**:

- Provide actionable feedback
- Include context about what went wrong
- Never expose sensitive information
- Log errors server-side for debugging

**Performance**:

- Cache expensive operations when possible
- Use streaming for large responses
- Keep tool execution fast (< 1s ideal)
- Handle timeouts gracefully

**Type Safety**:

- Enable TypeScript strict mode
- Define proper types for all arguments
- Use zod schemas for runtime validation
- Never use `any` types

## Testing Approach

1. **Unit tests** for individual tool logic
2. **Integration tests** for request handlers
3. **MCP Inspector** for protocol compliance
4. **Claude Desktop** for end-to-end testing

## Common Patterns

**Multiple Tools**:

```typescript
const tools = ["tool1", "tool2", "tool3"] as const;
type ToolName = (typeof tools)[number];

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name as ToolName;

  switch (name) {
    case "tool1":
      return handleTool1(request.params.arguments);
    case "tool2":
      return handleTool2(request.params.arguments);
    case "tool3":
      return handleTool3(request.params.arguments);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});
```

**Async Operations**:

```typescript
// Always await async operations:
const result = await apiClient.fetch();

// Handle timeouts:
const result = await Promise.race([operation(), timeout(5000)]);
```

## Configuration Example

For Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["/path/to/build/index.js"]
    }
  }
}
```

## Documentation Checklist

- [ ] README with installation instructions
- [ ] Example usage for each tool
- [ ] Claude Desktop configuration example
- [ ] API reference for all tools/resources
- [ ] Error handling documentation
- [ ] Changelog for version updates

## Resources

- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **MCP Specification**: https://modelcontextprotocol.io/llms-full.txt
- **Example Servers**: https://github.com/modelcontextprotocol/servers

## Remember

- **Validate everything** - Use zod schemas for all inputs
- **Error handling is critical** - Use McpError, provide context
- **Types are your friend** - Strict TypeScript prevents runtime errors
- **Test thoroughly** - Unit tests + MCP Inspector + Claude Desktop
- **Document clearly** - Examples and usage patterns help adoption
- **Keep it simple** - One tool should do one thing well

MCP servers are production infrastructure. Build them with the same rigor as any critical system.
