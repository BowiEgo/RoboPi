/**
 * Plugin/transport layer — transport abstraction.
 *
 * A `Transport` is the single communication channel between the Agent Host
 * and its host process (Electron main, the web server, a test script, …).
 * The Agent Host never calls `process.send` directly — it goes through the
 * transport selected at startup.
 *
 * This file is Node-only (it is never imported by the renderer).
 */

import type { AgentMessage } from "../../../shared/agent-types.ts";

export interface Transport {
	/** Send a message to the host (broadcast to every connected client). */
	send(msg: AgentMessage): void;
	/**
	 * Register an inbound-message handler. Returns an idempotent unsubscribe
	 * function.
	 */
	onMessage(cb: (msg: AgentMessage) => void): () => void;
	/** Start the transport (a WS transport listens here). */
	start(): Promise<void>;
	/** Stop the transport. */
	stop(): Promise<void>;
}
