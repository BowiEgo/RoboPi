/**
 * IPC helpers — stateless message/ID utilities shared across the agent host.
 */

import type { AgentMessage } from "../../shared/agent-types.ts";

export function postMessageToHost(msg: AgentMessage): void {
	if (process.send) process.send(msg);
}

export function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
