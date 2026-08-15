/**
 * Plugin kernel — core types.
 *
 * The minimal vocabulary shared by every layer of the plugin system:
 * disposers, event/service maps, and lifecycle states.
 *
 * The design mirrors DeepSeek Harness's Cordis runtime, distilled to four
 * ideas:
 *   1. a plugin is a function receiving `(ctx, config)`;
 *   2. services are looked up by string key, never by import;
 *   3. every registration is a reversible effect (a disposer);
 *   4. plugins communicate through typed events.
 *
 * Extension points for applications (via TypeScript declaration merging).
 * Events are declared as FULL SIGNATURES, exactly like Cordis: a waterfall
 * event includes its `next` continuation in the signature, a plain emit
 * event does not.
 *
 * ```ts
 * declare module "./types" {
 *   interface PluginEvents {
 *     "chat:send": (payload: ChatSendPayload) => void
 *     // Waterfall events carry `next` in their signature:
 *     "agent/pre-step": (request: AgentRequest, next: Next) => unknown
 *   }
 *   interface PluginServices {
 *     model: ModelService
 *   }
 * }
 * ```
 */

// A one-shot cleanup function. MUST be idempotent (safe to call twice).
export type Disposer = () => void | Promise<void>;

/**
 * A waterfall listener receives the event args plus a `next` continuation.
 * Like Cordis, `next()` takes NO arguments: every listener in the chain
 * receives the ORIGINAL event arguments, so parameter flow never changes.
 * Listeners influence the chain by mutating objects in `args`, replacing
 * the return value, or short-circuiting by not calling `next()`.
 */
export type Next = (...args: unknown[]) => unknown;

/**
 * Event name → listener signature (documentation type). Events are declared
 * by augmenting {@link PluginEvents}; waterfall events include `next`.
 * Generic parameters are constrained with `object` (not this type), because
 * TypeScript interfaces do not satisfy `Record` index-signature constraints.
 */
export type EventMap = Record<string, (...args: unknown[]) => unknown>;

/** Service name → service implementation type (documentation type). */
export type ServiceMap = Record<string, unknown>;

/**
 * Internal events emitted by the kernel itself. Listenable by plugins (e.g.
 * to react to a sibling providing a service), but never dispatched manually.
 */
export interface PluginInternalEvents {
	/** Fired after a service implementation is registered. */
	"plugin/service-provided": (key: string) => void;
	/** Fired after a service implementation is removed. */
	"plugin/service-removed": (key: string) => void;
}

/**
 * Default event map, merged by applications via declaration merging.
 * Extends the internal events so plugins can observe kernel activity.
 */
export interface PluginEvents extends PluginInternalEvents {}

/** Default service map, merged by applications via declaration merging. */
export interface PluginServices extends ServiceMap {}

/** Plugin lifecycle states, mirroring Cordis fiber states (simplified). */
export type PluginState = "pending" | "active" | "failed" | "disposed";

/** Base error for kernel violations (duplicate id, inactive context, ...). */
export class PluginError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PluginError";
	}
}
