/**
 * Agent IPC bridge.
 *
 * Electron: wraps window.agent (the IPC bridge exposed by preload).
 * Web: a WebSocket client to the Agent Host's WS transport (default port
 *       9241, matching ROBOPI_PORT). The web server only serves static files
 *       and settings; agent messages flow straight to the Agent Host.
 *
 * Any component that needs to talk to the Agent Host can import it.
 */

export interface AgentIpc {
	send: (msg: unknown) => void;
	onMessage: (cb: (msg: unknown) => void) => () => void;
}

let cached: AgentIpc | null | undefined;

/** Default Agent Host WebSocket port (mirrors ROBOPI_PORT in the backend). */
const WS_PORT = 9241;

/** Browser transport — a WebSocket client with automatic reconnect. */
function createWsIpc(): AgentIpc {
	const listeners = new Set<(msg: unknown) => void>();
	let ws: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	const url = `ws://${location.hostname || "localhost"}:${WS_PORT}`;

	function connect() {
		if (ws) return;
		ws = new WebSocket(url);
		ws.onmessage = (ev) => {
			try {
				const msg = JSON.parse(ev.data as string) as unknown;
				for (const listener of listeners) listener(msg);
			} catch {
				// Ignore malformed frames.
			}
		};
		ws.onclose = () => {
			ws = null;
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				if (listeners.size > 0) connect();
			}, 1000);
		};
	}

	return {
		send(msg) {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify(msg));
			}
			// Not connected yet: drop — the Agent Host replays state on connect.
		},
		onMessage(cb) {
			listeners.add(cb);
			connect();
			return () => {
				listeners.delete(cb);
				if (listeners.size === 0) {
					if (reconnectTimer) clearTimeout(reconnectTimer);
					ws?.close();
					ws = null;
				}
			};
		},
	};
}

export function getAgentIpc(): AgentIpc | null {
	if (cached !== undefined) return cached;

	try {
		cached = window.agent ?? createWsIpc();
	} catch {
		cached = null;
	}

	return cached;
}
