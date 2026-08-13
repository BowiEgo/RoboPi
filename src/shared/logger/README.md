# Logger

Structured logging for the RoboPi backend (agent-host child process and the
Electron main process).

## Features

- Four log levels with environment-variable filtering
- Consistent structured format with ISO timestamp, level, and module name
- File persistence with size-based rotation
- Automatic secret redaction (API keys, bearer tokens)
- Error objects are normalized to messages automatically

## Import

```ts
import { createLogger } from "../../shared/logger/index.ts";

const logger = createLogger("MyModule");
```

## Usage

```ts
logger.debug("Entering function", someValue);
logger.info("Session created", sessionId);
logger.warn("Retrying request", err);
logger.error("Fatal failure", err);
```

- `meta` is optional and accepts any value. `Error` objects are converted to
  `error.message`; everything else goes through `String(meta)`.
- Messages and metadata are passed through `redact()` automatically — never
  log raw credentials.

## Output format

```
[2026-08-13T11:00:00.000Z] [INFO] [SessionHost] Session created: abc123
[2026-08-13T11:00:01.000Z] [ERROR] [AgentHost] prompt error | Request timed out
```

## Log levels

| Level | Use case |
|-------|----------|
| `debug` | Verbose internals: message routing, tool execution, IPC traffic |
| `info` | Normal lifecycle: startup, session CRUD, model changes |
| `warn` | Recoverable problems: fallbacks, retries |
| `error` | Failures that need attention |

Default console threshold is auto-detected: `debug` in development, `error`
in production. Set `PI_LOG_LEVEL` explicitly to override.

The file threshold is independent and defaults to `info`, so production
still persists a useful trail even when the console is quiet. Override it
with `PI_LOG_FILE_LEVEL`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_LOG_LEVEL` | auto (`debug` dev / `error` prod) | Console minimum level: `debug` \| `info` \| `warn` \| `error` |
| `PI_LOG_FILE_LEVEL` | `info` | File minimum level: `debug` \| `info` \| `warn` \| `error` |
| `PI_LOG_DIR` | `~/.robopi/logs` | Directory for log files |
| `PI_LOG_MAX_SIZE` | `5242880` (5 MB) | Rotate the file once it exceeds this many bytes |
| `PI_LOG_MAX_FILES` | `3` | Number of rotated `.1`, `.2`, … copies to keep |

### Examples

```bash
# Full verbosity (debug + info + warn + error)
PI_LOG_LEVEL=debug npm run dev

# Errors only
PI_LOG_LEVEL=error npm run dev

# Custom log directory
PI_LOG_DIR=/tmp/robopi-logs npm run dev
```

## File persistence

Logs are appended to `$PI_LOG_DIR/agent-host.log`. When the file exceeds
`PI_LOG_MAX_SIZE`, it is renamed to `agent-host.log.1`, the previous `.1` to
`.2`, and so on, keeping at most `PI_LOG_MAX_FILES` copies.

All file operations are best-effort — a failure to write never breaks the
application.

## Redaction

The `redact()` helper masks common secret patterns:

| Pattern | Before | After |
|---------|--------|-------|
| API key | `sk-ant-api03-abc123…` | `sk-***` |
| Bearer token | `Bearer eyJhbGciOi…` | `Bearer ***` |

> Note: this is a safety net, not a substitute for not logging secrets in the
> first place. Do not pass credentials as `meta` or embed them in messages.

## Conventions

- Pick a short, stable module name per file: `AgentHost`, `SessionHost`,
  `TitleGenerator`, `AgentHostManager`.
- Log once at the source of truth; avoid duplicate logs in wrapper layers.
- Use `debug` for anything that fires on every message or tool call.
- Pass `Error` objects as `meta`, not via `String(err)` — the logger extracts
  the message for you.
