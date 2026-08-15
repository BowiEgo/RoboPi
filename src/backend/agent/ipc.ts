/**
 * IPC helpers — the Agent Host's single communication seam.
 *
 * Everything the Agent Host sends to its host goes through `postMessageToHost`;
 * everything it receives goes through `onHostMessage`. Both delegate to the
 * selected `Transport`, defaulting to the child-process IPC channel.
 */

import type { AgentMessage } from "../../shared/agent-types.ts";
import { ChildProcessTransport } from "./transport/child-process.ts";
import type { Transport } from "./transport/types.ts";

let transport: Transport = new ChildProcessTransport();

/** Swap the transport (e.g. to WebSocket at startup). */
export function setTransport(t: Transport): void {
	transport = t;
}

/** Send a message to the host process. */
export function postMessageToHost(msg: AgentMessage): void {
	transport.send(msg);
}

/** Register an inbound-message handler. */
export function onHostMessage(cb: (msg: AgentMessage) => void): () => void {
	return transport.onMessage(cb);
}

export function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
