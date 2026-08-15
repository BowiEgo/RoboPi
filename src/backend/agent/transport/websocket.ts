/**
 * WebSocket transport — lets the Agent Host run as a standalone service.
 *
 * The Agent Host listens on a loopback WebSocket port; any host process
 * (Electron main, the web server, a script, a future mobile companion) can
 * connect and exchange `AgentMessage` JSON frames. `send()` broadcasts to
 * every connected client, which is what makes multi-frontend support possible
 * later.
 *
 * Future multi-downstream: a WebSocket can multiplex several named streams
 * over one connection (see stream.ts). When that lands, this transport
 * implements `StreamableTransport` and tags each frame with its stream id.
 *
 * Authentication is intentionally out of scope here: the server binds to
 * 127.0.0.1 only, and a token layer comes in a later phase.
 */

import { WebSocket, WebSocketServer } from "ws";

import type { AgentMessage } from "../../../shared/agent-types.ts";
import type { Transport } from "./types.ts";

export class WebSocketTransport implements Transport {
	private wss: WebSocketServer | null = null;
	private readonly sockets = new Set<WebSocket>();
	private readonly listeners = new Set<(msg: AgentMessage) => void>();
	private readonly port: number;

	constructor(port: number) {
		this.port = port;
	}

	async start(): Promise<void> {
		this.wss = new WebSocketServer({ host: "127.0.0.1", port: this.port });

		this.wss.on("connection", (socket) => {
			this.sockets.add(socket);
			socket.on("message", (raw) => {
				let msg: AgentMessage;
				try {
					msg = JSON.parse(raw.toString()) as AgentMessage;
				} catch {
					return; // Ignore malformed frames.
				}
				for (const cb of this.listeners) cb(msg);
			});
			socket.on("close", () => this.sockets.delete(socket));
			socket.on("error", () => this.sockets.delete(socket));
		});
	}

	send(msg: AgentMessage): void {
		const data = JSON.stringify(msg);
		for (const socket of this.sockets) {
			if (socket.readyState === WebSocket.OPEN) socket.send(data);
		}
	}

	onMessage(cb: (msg: AgentMessage) => void): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	async stop(): Promise<void> {
		for (const socket of this.sockets) socket.close();
		this.sockets.clear();
		this.wss?.close();
		this.wss = null;
	}
}
