/**
 * Agent IPC bridge.
 *
 * Wraps window.agent (the Electron IPC bridge exposed by preload).
 * Any component that needs to talk to the Agent Host can import it.
 */

export interface AgentIpc {
	send: (msg: unknown) => void;
	onMessage: (cb: (msg: unknown) => void) => () => void;
}

let cached: AgentIpc | null | undefined;

export function getAgentIpc(): AgentIpc | null {
	if (cached !== undefined) return cached;

	try {
		cached = window.agent ?? null;
	} catch {
		cached = null;
	}

	return cached;
}
