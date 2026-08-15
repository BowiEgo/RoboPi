/**
 * Stdio transport — headless mode.
 *
 * Reads inbound `AgentMessage` JSON lines from stdin and writes outbound
 * frames to stdout, one JSON object per line. Logging must go to stderr
 * (PI_LOG_TO_STDERR=1) so stdout stays a clean protocol stream.
 *
 * Usage:
 *   ROBOPI_TRANSPORT=stdio PI_LOG_TO_STDERR=1 node agent-host.mjs
 *   echo '{"id":"1","type":"session:list","payload":{}}' | ...
 */

import { createInterface } from "node:readline";

import type { AgentMessage } from "../../../shared/agent-types.ts";
import type { Transport } from "./types.ts";

export class StdioTransport implements Transport {
	private rl: ReturnType<typeof createInterface> | null = null;
	private readonly listeners = new Set<(msg: AgentMessage) => void>();

	async start(): Promise<void> {
		this.rl = createInterface({ input: process.stdin });
		this.rl.on("line", (line) => {
			let msg: AgentMessage;
			try {
				msg = JSON.parse(line) as AgentMessage;
			} catch {
				return; // Ignore malformed lines.
			}
			for (const cb of this.listeners) cb(msg);
		});
	}

	send(msg: AgentMessage): void {
		process.stdout.write(`${JSON.stringify(msg)}\n`);
	}

	onMessage(cb: (msg: AgentMessage) => void): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	async stop(): Promise<void> {
		this.rl?.close();
		this.rl = null;
	}
}
