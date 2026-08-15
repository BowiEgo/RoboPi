/**
 * Plugin kernel — public exports.
 *
 * ```ts
 * import { PluginRegistry, type PluginManifest } from "@shared/plugin";
 *
 * const registry = new PluginRegistry({
 *   onError: (error) => logger.error(error),
 * });
 *
 * const chat = registry.load(
 *   { id: "core:chat", inject: ["session"], Config: object({ maxTokens: number() }) },
 *   (ctx, config) => {
 *     const remove = ctx.on("chat:send", (payload) => { ... });
 *     return remove; // optional — ctx.on() already auto-registers cleanup
 *   },
 *   { maxTokens: 4096 },
 * );
 * await chat.ready();
 * ```
 */

export {
	EventBus,
	isBailed,
	PluginContext,
	type SerialListener,
	type WaterfallListener,
} from "./context";
export {
	type PluginEntry,
	type PluginHandle,
	type PluginManifest,
	PluginRegistry,
	type PluginRegistryOptions,
} from "./registry";
export {
	boolean,
	number,
	object,
	optional,
	passthrough,
	type Schema,
	type SchemaIssue,
	type SchemaResult,
	string,
	ValidationError,
} from "./schema";
export {
	type Disposer,
	type EventMap,
	type Next,
	PluginError,
	type PluginEvents,
	type PluginInternalEvents,
	type PluginServices,
	type PluginState,
	type ServiceMap,
} from "./types";
