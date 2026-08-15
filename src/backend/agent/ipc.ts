/**
 * IPC helpers — the Agent Host's single communication seam.
 *
 * Everything the Agent Host sends to its host goes through `postMessageToHost`;
 * everything it receives goes through `onHostMessage`. Both delegate to the
 * selected `Transport`, defaulting to the child-process IPC channel.
 *
 * State replay: a handful of message types are "state", not "events" —
 * a client that connects late still needs the current session/model/config.
 * `postMessageToHost` caches the latest of each, and `replayState` replays
 * them to a newly connected client.
 */

import { type AgentMessage, AgentMessageType } from "../../shared/agent-types.ts";
import { ChildProcessTransport } from "./transport/child-process.ts";
import type { Transport } from "./transport/types.ts";

let transport: Transport = new ChildProcessTransport();

/** Message types whose LATEST value is replayed to new clients. */
const REPLAYABLE_TYPES = new Set<string>([
	AgentMessageType.AgentReady,
	AgentMessageType.SessionSwitched,
	AgentMessageType.SessionListResult,
	AgentMessageType.AgentConfig,
	AgentMessageType.UIManifest,
	AgentMessageType.PluginList,
]);

/** Latest state per replayable type, in first-seen order. */
const stateCache = new Map<string, AgentMessage>();

/** Swap the transport (e.g. to WebSocket at startup). */
export function setTransport(t: Transport): void {
	transport = t;
}

/** Send a message to the host process, caching it if it is replayable state. */
export function postMessageToHost(msg: AgentMessage): void {
	transport.send(msg);
	if (REPLAYABLE_TYPES.has(msg.type)) {
		stateCache.set(msg.type, msg);
	}
}

/** Replay cached state messages to a newly connected client. */
export function replayState(send: (msg: AgentMessage) => void): void {
	for (const msg of stateCache.values()) send(msg);
}

/** Register an inbound-message handler. */
export function onHostMessage(cb: (msg: AgentMessage) => void): () => void {
	return transport.onMessage(cb);
}

export function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
