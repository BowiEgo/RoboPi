/**
 * Structured logger with levels, file persistence, rotation, and redaction.
 *
 * Levels: debug < info < warn < error.
 *
 * Console and file thresholds are independent:
 *   - Console threshold auto-detects env (dev → debug, prod → error),
 *     overridable via PI_LOG_LEVEL.
 *   - File threshold defaults to info, overridable via PI_LOG_FILE_LEVEL,
 *     so production still persists a useful trail even when the console is
 *     quiet.
 *
 * Output format: [ISO timestamp] [LEVEL] [module] message
 *
 * File persistence (via PI_LOG_DIR env var, default ~/.robopi/logs):
 *   Logs are appended to agent-host.log and rotated at PI_LOG_MAX_SIZE
 *   (default 5 MB), keeping PI_LOG_MAX_FILES (default 3) rotated copies.
 */

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

function resolveThreshold(): Level {
	const raw = process.env.PI_LOG_LEVEL?.toLowerCase();
	if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
		return raw;
	}
	return isDevelopment() ? "debug" : "error";
}

/** File threshold is independent of the console threshold and defaults to info. */
function resolveFileThreshold(): Level {
	const raw = process.env.PI_LOG_FILE_LEVEL?.toLowerCase();
	if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
		return raw;
	}
	return "info";
}

/** Detect dev vs production when PI_LOG_LEVEL is not set explicitly. */
function isDevelopment(): boolean {
	// electron-vite sets ELECTRON_RENDERER_URL only in dev mode
	if (process.env.ELECTRON_RENDERER_URL) return true;
	if (process.env.NODE_ENV === "development") return true;
	if (process.env.NODE_ENV === "production") return false;
	// No signal → assume dev (the common case when running from source)
	return true;
}

function logDir(): string {
	return process.env.PI_LOG_DIR ?? join(homedir(), ".robopi", "logs");
}

function logFilePath(): string {
	return join(logDir(), "agent-host.log");
}

function maxSize(): number {
	const raw = Number(process.env.PI_LOG_MAX_SIZE);
	return Number.isFinite(raw) && raw > 0 ? raw : 5 * 1024 * 1024; // 5 MB
}

function maxFiles(): number {
	const raw = Number(process.env.PI_LOG_MAX_FILES);
	return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

/** Rotate the log file when it exceeds the size threshold. */
function rotateIfNeeded(file: string): void {
	try {
		if (!existsSync(file)) return;
		if (statSync(file).size < maxSize()) return;

		const keep = maxFiles();
		for (let i = keep - 1; i >= 0; i--) {
			const src = i === 0 ? file : `${file}.${i}`;
			const dst = `${file}.${i + 1}`;
			if (existsSync(src)) renameSync(src, dst);
		}
	} catch {
		// Rotation is best-effort; never let it break logging.
	}
}

function appendToFile(line: string): void {
	try {
		const dir = logDir();
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		const file = logFilePath();
		rotateIfNeeded(file);
		appendFileSync(file, line + "\n", "utf-8");
	} catch {
		// File logging is best-effort.
	}
}

/** Redact common secret patterns (API keys, bearer tokens). */
export function redact(text: string): string {
	return text
		.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***")
		.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***");
}

function formatError(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

// ── ANSI colors (console only, never written to files) ──

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const LEVEL_COLORS: Record<Level, string> = {
	debug: "\x1b[37m", // bright white (light gray)
	info: "\x1b[36m", // cyan
	warn: "\x1b[33m", // yellow
	error: "\x1b[31m", // red
};

const MODULE_COLOR = "\x1b[35m"; // magenta

// When true, all console output goes to stderr, leaving stdout clean for
// protocol frames (used by the stdio transport).
const logToStderr = process.env.PI_LOG_TO_STDERR === "1";

export interface Logger {
	debug: (msg: string, meta?: unknown) => void;
	info: (msg: string, meta?: unknown) => void;
	warn: (msg: string, meta?: unknown) => void;
	error: (msg: string, meta?: unknown) => void;
}

export function createLogger(module: string): Logger {
	const consoleThreshold = LEVEL_ORDER[resolveThreshold()];
	const fileThreshold = LEVEL_ORDER[resolveFileThreshold()];

	function log(level: Level, msg: string, meta?: unknown): void {
		const ts = new Date().toISOString();
		const metaStr = meta !== undefined ? ` | ${redact(formatError(meta))}` : "";
		const message = `${redact(msg)}${metaStr}`;

		// File persistence: plain text, no ANSI escapes.
		if (LEVEL_ORDER[level] >= fileThreshold) {
			appendToFile(`[${ts}] [${level.toUpperCase()}] [${module}] ${message}`);
		}

		// Console output: colored, respects the console threshold.
		if (LEVEL_ORDER[level] >= consoleThreshold) {
			const color = LEVEL_COLORS[level];
			const colored = `${DIM}[${ts}]${RESET} ${color}${BOLD}[${level.toUpperCase()}]${RESET} ${MODULE_COLOR}[${module}]${RESET} ${color}${message}${RESET}`;
			// stdio transport: keep stdout clean for protocol frames, log to stderr.
			if (logToStderr) console.error(colored);
			else if (level === "error") console.error(colored);
			else if (level === "warn") console.warn(colored);
			else console.log(colored);
		}
	}

	return {
		debug: (msg, meta) => log("debug", msg, meta),
		info: (msg, meta) => log("info", msg, meta),
		warn: (msg, meta) => log("warn", msg, meta),
		error: (msg, meta) => log("error", msg, meta),
	};
}
