/**
 * Multi-downstream framework (reserved — no runtime wiring yet).
 *
 * The current transport is a SINGLE bidirectional channel: every message
 * (chat chunks, session events, system notifications) travels through the
 * same `Transport.send()`, and clients demultiplex by message type. That is
 * the right shape while the UI is one chat window consuming one stream.
 *
 * When the product outgrows it — e.g. multiple UI panels subscribing to
 * different data, per-stream reconnect/replay, or backpressure priorities —
 * split the single channel into named logical streams. This module fixes the
 * vocabulary so the split is a mechanical extension, not a redesign.
 *
 * Reference: DeepSeek Harness runs TWO downstream streams over one WebSocket
 * (mux = all-session events, host = session lifecycle / system info), and
 * gives each its own reconnect + replay. That split is the model to follow
 * when RoboPi needs it.
 */

/** Identity of a logical downstream stream. */
export type StreamId = string;

/** One frame on a downstream stream. Concrete frame unions are defined per stream. */
export interface DownstreamFrame {
	type: string;
	payload: unknown;
}

/**
 * A logical downstream: a server-initiated, independently-addressable data
 * channel. Each stream owns its own frames, subscription, reconnect and
 * replay policy.
 */
export interface Downstream {
	readonly id: StreamId;
	/** Push one frame to every client subscribed to this stream. */
	send(frame: DownstreamFrame): void;
}

/**
 * A transport that can expose multiple named downstream streams.
 *
 * Current transports (ChildProcess / WebSocket / Stdio) implement only the
 * single-stream `Transport` interface. When multi-stream is needed, the
 * WebSocket transport is the natural first implementer (one socket, many
 * logical streams multiplexed by stream id) — see `websocket.ts`.
 */
export interface StreamableTransport {
	/** Open (or fetch the cached handle for) a named downstream stream. */
	stream(id: StreamId): Downstream;
}
