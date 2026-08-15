/**
 * Child-process transport — the Agent Host's default channel.
 *
 * When the Agent Host is spawned with an IPC stdio channel (`stdio: [..., "ipc"]`),
 * inbound messages arrive via `process.on("message")` and outbound messages
 * leave via `process.send()`. This transport wraps those two primitives so the
 * rest of the Agent Host only sees the `Transport` interface.
 */

import type { AgentMessage } from "../../../shared/agent-types.ts";
import type { Transport } from "./types.ts";

export class ChildProcessTransport implements Transport {
	send(msg: AgentMessage): void {
		if (process.send) process.send(msg);
	}

	onMessage(cb: (msg: AgentMessage) => void): () => void {
		const handler = (raw: unknown) => cb(raw as AgentMessage);
		process.on("message", handler);
		return () => process.off("message", handler);
	}

	async start(): Promise<void> {}

	async stop(): Promise<void> {}
}
