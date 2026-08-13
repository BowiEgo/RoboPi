# RoboPi Code Style Guide

## Tooling

| Tool | Purpose | Config |
|------|---------|--------|
| [Biome](https://biomejs.dev) | Linting + formatting | `biome.json` (preset: recommended) |
| [Vitest](https://vitest.dev) | Testing | `vitest.config.ts` |
| TypeScript | Type checking | `tsconfig.node.json` / `tsconfig.web.json` |

Run checks:

```bash
npx biome check src/agent-host/
npx tsc --noEmit --project tsconfig.node.json
npx vitest run
```

---

## Formatting (Biome)

- **Indent**: tabs
- **Quotes**: double (TypeScript/JS), single (CSS)
- **Semicolons**: always
- **Trailing commas**: always
- **Line width**: 80 (default)

---

## Comments

### Hierarchy

| Level | Style | Usage |
|-------|-------|-------|
| File doc | `/** */` | File-level description, module purpose |
| Top-level section | `// ====` | Major sections within a file |
| Class member group | `// ----` | Group fields / methods within a class |
| JSDoc | `/** */` | Public API documentation |
| Inline | `//` | Brief explanations, edge-case notes |

### Language

All comments must be in **English**.

### Examples

```ts
/**
 * Session management module.
 *   - Session CRUD, persistence, event forwarding.
 *   - All state is encapsulated in the SessionHost class.
 */

// ============================================================================
// IPC helpers (stateless, module-level exports)
// ============================================================================

export class SessionHost {
    // ---- Public read-only state ----
    session: AgentSession | null = null;
    currentSessionId: string | null = null;

    // ---- Internal state ----
    private needsTitleGen = false;

    // ---- IPC Handlers ----

    async createSession(msgId: string, payload): Promise<void> { ... }
}
```

---

## Module Organization

### Directory structure

```
src/
├── agent-host/        # Child process: Pi SDK agent
│   ├── index.ts       #   Entry point, IPC routing, lifecycle
│   ├── agent.ts       #   AgentHost class (config, initialization)
│   ├── session.ts     #   SessionHost class (session CRUD, SDK events)
│   └── session.test.ts
├── main/              # Electron main process
│   └── agent-host-manager.ts  # Child process lifecycle manager
├── renderer/          # Electron renderer (SolidJS)
│   └── src/
│       ├── agent/     #   Agent IPC hooks
│       └── pages/     #   UI pages
└── shared/            # Cross-layer type definitions
    ├── agent-types.ts #   IPC message types
    └── utils.ts       #   Shared utilities
```

### Principles

- **Classes over module globals**: Encapsulate state in classes (see `SessionHost`, `AgentHost`). Avoid `export let` mutable variables at module scope.
- **One responsibility per class**:
  - `AgentHost` — model config, SDK initialization.
  - `SessionHost` — session lifecycle, event subscription, IPC forwarding.
- **Pure functions at module level**: Stateless helpers (`uid()`, `postMessageToHost()`, `extractLastUserText()`) may be exported directly.
- **Handler extraction**: Each `switch` case in message routing should dispatch to a named handler function rather than containing inline logic.

---

## TypeScript

### Enums

Use the `as const` object pattern instead of TypeScript `enum`. This is required for Node.js `--experimental-strip-types` compatibility.

```ts
// ✅ Correct
export const AgentMessageType = {
    ChatSend: "chat:send",
    ChatCancel: "chat:cancel",
} as const;

export type AgentMessageType =
    (typeof AgentMessageType)[keyof typeof AgentMessageType];

// ❌ Avoid — not supported by strip-types
export enum AgentMessageType {
    ChatSend = "chat:send",
}
```

### Imports

- Use `type` keyword for type-only imports.
- Use `.ts` extension for relative imports (required by strip-types).
- Use `@shared/*` path alias for shared types in renderer code.

```ts
// agent-host (Node.js with strip-types)
import { AgentMessageType, type AgentMessage } from "../shared/agent-types.ts";
import { SessionHost } from "./session.ts";

// renderer (bundled, uses aliases)
import { AgentMessageType } from "@shared/agent-types";
```

### Non-null assertions

Avoid the `!` non-null assertion operator. Use one of:

- **Optional chaining** `?.` when the value may legitimately be absent.
- **Early guard** `if (!value) throw/return` when the value is required.
- **Local variable capture** to narrow a union after a check.

```ts
// ✅ Capture to narrow
const host = sh();
if (!host.session) return;
host.session.prompt(...);  // narrowed

// ✅ Optional chain
return agentHost.sessionHost?.dispose();

// ❌ Avoid
this.session!.prompt(...);
```

---

## IPC

### Message validation

Every IPC entry point must validate the message before dispatching:

```ts
process.on("message", (raw: unknown) => {
    const msg = raw as AgentMessage;
    if (!msg?.type || !isValidMessageType(msg.type)) {
        console.warn("[AgentHost] Received invalid message:", raw);
        return;
    }
    // ... dispatch
});
```

### Message routing

Use a `switch` statement that maps each message type to a handler:

```ts
switch (msg.type) {
    case AgentMessageType.ChatSend:
        handleChatSend(msg);
        break;
    case AgentMessageType.SessionCreate:
        sessionHost.createSession(msg.id, msg.payload);
        break;
}
```

---

## Testing (Vitest)

- Test files: `*.test.ts` alongside source files.
- Pure functions are preferred — export them for direct testing.
- Use `vi.fn()` for mocking (`process.send`, etc.).
- Mock objects with `// biome-ignore lint/suspicious/noExplicitAny: test mock`.

```ts
import { describe, expect, it, vi } from "vitest";

describe("postMessageToHost", () => {
    beforeEach(() => { process.send = vi.fn(); });
    afterEach(() => { process.send = originalSend; });

    it("calls process.send with the message", () => {
        postMessageToHost({ id: "1", type: AgentMessageType.ChatSend, ... });
        expect(process.send).toHaveBeenCalledTimes(1);
    });
});
```
