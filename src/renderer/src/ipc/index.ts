/**
 * Agent IPC bridge.
 *
 * Electron: wraps window.agent (the IPC bridge exposed by preload).
 * Web: connects to the RoboPi web server via Server-Sent Events
 *       (agent → UI) + HTTP POST (UI → agent).
 *
 * Any component that needs to talk to the Agent Host can import it.
 */

export interface AgentIpc {
	send: (msg: unknown) => void;
	onMessage: (cb: (msg: unknown) => void) => () => void;
}

let cached: AgentIpc | null | undefined;

/** Browser transport — mirrors window.agent using SSE + fetch (same origin). */
function createWebIpc(): AgentIpc {
	const listeners = new Set<(msg: unknown) => void>();
	let es: EventSource | null = null;

	function ensureStream() {
		if (es) return;
		es = new EventSource("/agent/stream");
		es.onmessage = (ev) => {
			try {
				const msg = JSON.parse(ev.data as string) as unknown;
				for (const listener of listeners) listener(msg);
			} catch {
				// Ignore malformed frames.
			}
		};
		// EventSource reconnects automatically; keep `es` until closed explicitly.
	}

	return {
		send(msg) {
			fetch("/agent/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(msg),
			}).catch(() => {
				// Server not reachable yet — SSE will reconnect once it is.
			});
		},
		onMessage(cb) {
			listeners.add(cb);
			ensureStream();
			return () => {
				listeners.delete(cb);
				if (listeners.size === 0) {
					es?.close();
					es = null;
				}
			};
		},
	};
}

export function getAgentIpc(): AgentIpc | null {
	if (cached !== undefined) return cached;

	try {
		cached = window.agent ?? createWebIpc();
	} catch {
		cached = null;
	}

	return cached;
}
