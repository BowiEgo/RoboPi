/**
 * Plugin kernel — registry (plugin loader).
 *
 * Turns a `PluginManifest` + entry function into a live plugin with a
 * lifecycle, mirroring Cordis's fiber state machine:
 *
 *   pending ──(all injected services provided)──▶ active
 *      │                                            │
 *      │ (entry threw)                              │ (dispose())
 *      ▼                                            ▼
 *   failed ──(dispose/reload)──▶ disposed
 *
 * Dependency resolution is availability-driven, exactly like Cordis: a
 * plugin whose `inject` services are missing stays `pending`; the registry
 * re-checks it whenever any plugin provides a service (`plugin/service-
 * provided` internal event). Load order therefore never needs manual
 * sequencing — plugins may be loaded in any order.
 *
 * Everything a plugin registers lives in its own child context and unwinds
 * when the plugin is disposed (reverse registration order), so unloading and
 * reloading are always clean.
 *
 * This file is isomorphic (no Node imports).
 */

import { EventBus, PluginContext } from "./context.ts";
import { type Schema, ValidationError } from "./schema.ts";
import type { UIExtension } from "../ui-types.ts";
import {
	type Disposer,
	PluginError,
	type PluginEvents,
	type PluginInternalEvents,
	type PluginServices,
	type PluginState,
} from "./types.ts";

/** Declarative description of one plugin. */
export interface PluginManifest<S extends object = PluginServices, C = unknown> {
	/** Globally unique id; the target of config overrides in the assembly layer. */
	id: string;
	/** Human-readable display name (defaults to `id`). */
	name?: string;
	/** Plugin package version, when distributed externally. */
	version?: string;
	/** Services this plugin requires; it stays pending until all are provided. */
	inject?: (keyof S & string)[];
	/** Services this plugin declares it provides (documentation + pre-check). */
	provide?: (keyof S & string)[];
	/** Config validator applied before the entry runs. */
	Config?: Schema<C>;
	/** Declarative UI contribution (see shared/ui-types.ts). */
	ui?: UIExtension;
	/** Core plugins cannot be disabled — they are listed but not toggleable. */
	core?: boolean;
}

/**
 * The plugin body: receives the plugin's own context and the validated
 * config. May return a disposer (or array of disposers, or a Promise of
 * either) to be unwound on unload, on top of anything registered through
 * `ctx.effect()` / `ctx.on()` / `ctx.provide()`.
 */
export type PluginEntry<E extends object = PluginEvents, S extends object = PluginServices> =
	| ((ctx: PluginContext<E, S>, config: unknown) => void)
	| ((ctx: PluginContext<E, S>, config: unknown) => Disposer | Disposer[] | Promise<Disposer | Disposer[] | undefined>);

/** Live handle for a loaded plugin. */
export interface PluginHandle<E extends object = PluginEvents, S extends object = PluginServices> {
	readonly id: string;
	readonly manifest: PluginManifest<S>;
	readonly ctx: PluginContext<E, S>;
	readonly state: PluginState;
	/** The config the plugin was loaded with (validated). */
	readonly config: unknown;
	/** Resolves once active; rejects once failed or disposed while pending. */
	ready(): Promise<void>;
	/** Unload the plugin: unwind every effect, remove its services. */
	dispose(): Promise<void>;
	/** Unload and reload with a new config; returns the fresh handle. */
	reload(config?: unknown): Promise<PluginHandle<E, S>>;
}

/** Options for {@link PluginRegistry}. */
export interface PluginRegistryOptions {
	/** Error sink for plugin failures (bridge to the app logger). */
	onError?: (error: unknown) => void;
}

/** The plugin loader: owns the root context, tracks handles, wakes pendings. */
export class PluginRegistry<E extends object = PluginEvents, S extends object = PluginServices> {
	/** Root context; every plugin context extends it. */
	readonly root: PluginContext<E, S>;

	private readonly bus: EventBus<E>;
	private readonly store = new Map<string, unknown>();
	private readonly onError: (error: unknown) => void;
	private readonly handles = new Map<string, PluginHandleImpl<E, S>>();
	private readonly pending = new Set<PluginHandleImpl<E, S>>();

	constructor(options: PluginRegistryOptions = {}) {
		this.onError = options.onError ?? ((error) => console.error(error));
		this.bus = new EventBus<E>();
		this.root = new PluginContext(this.bus, this.store, this.onError);
		// Availability-driven activation: any provide() wakes pending plugins.
		// (The internal event may not be part of a custom `E` map, hence the
		// narrow cast — kernel-internal, invisible to plugin authors.)
		(this.root as unknown as PluginContext<PluginInternalEvents, S>).on("plugin/service-provided", () =>
			this.flushPending(),
		);
	}

	/**
	 * Load a plugin. Returns immediately with a handle; activation is
	 * asynchronous (the entry may be async and may wait on injected
	 * services). Await `handle.ready()` to observe activation.
	 *
	 * @throws `PluginError` when the id is already loaded, or `ValidationError`
	 *         when config fails the manifest schema.
	 */
	load<C>(manifest: PluginManifest<S, C>, entry: PluginEntry<E, S>, config?: C): PluginHandle<E, S> {
		if (this.handles.has(manifest.id)) {
			throw new PluginError(`plugin "${manifest.id}" is already loaded`);
		}
		const resolved = this.validateConfig(manifest, config);
		const handle = new PluginHandleImpl(this, manifest, entry, resolved, this.root.extend());
		this.handles.set(manifest.id, handle);
		this.tryActivate(handle);
		return handle;
	}

	/** Unload a plugin by id. No-op when the id is not loaded. */
	async unload(id: string): Promise<void> {
		const handle = this.handles.get(id);
		if (!handle) return;
		await handle.dispose();
	}

	/** Unload and reload with a new config; returns the fresh handle. */
	async reload(id: string, config?: unknown): Promise<PluginHandle<E, S>> {
		const handle = this.handles.get(id);
		if (!handle) throw new PluginError(`plugin "${id}" is not loaded`);
		await handle.dispose();
		return this.load(handle.manifest, handle.entry, config);
	}

	/** Read a loaded handle by id. */
	get(id: string): PluginHandle<E, S> | undefined {
		return this.handles.get(id);
	}

	/** Whether a plugin with this id is loaded (any state). */
	has(id: string): boolean {
		return this.handles.has(id);
	}

	/** All loaded handles, in load order. */
	list(): PluginHandle<E, S>[] {
		return [...this.handles.values()];
	}

	/** Plugins still waiting on injected services (diagnostics). */
	pendingPlugins(): string[] {
		return [...this.pending].map((handle) => handle.id);
	}

	/** Remove a handle from the registry's tracking maps (used on dispose). */
	disposeHandle(handle: PluginHandleImpl<E, S>): void {
		this.handles.delete(handle.id);
		this.pending.delete(handle);
	}

	/** Unload every plugin, root context included (app shutdown). */
	async disposeAll(): Promise<void> {
		for (const handle of [...this.handles.values()]) {
			await handle.dispose();
		}
		await this.root.dispose();
	}

	private validateConfig<C>(manifest: PluginManifest<S, C>, config?: C): unknown {
		if (!manifest.Config) return config;
		const result = manifest.Config.validate(config);
		if ("issues" in result) {
			throw new ValidationError(result.issues);
		}
		return result.value;
	}

	private tryActivate(handle: PluginHandleImpl<E, S>): void {
		if (handle.state !== "pending") return;
		const missing = (handle.manifest.inject ?? []).filter((key) => !this.store.has(key));
		if (missing.length) {
			handle.pendingOn = missing;
			this.pending.add(handle);
			return;
		}
		handle.pendingOn = undefined;
		this.pending.delete(handle);
		void this.activate(handle);
	}

	private flushPending(): void {
		for (const handle of [...this.pending]) {
			this.tryActivate(handle);
		}
	}

	/**
	 * Run the entry. Synchronous entries complete synchronously (state is
	 * `active` right after `load()`); async entries settle when their
	 * promise does.
	 */
	private activate(handle: PluginHandleImpl<E, S>): Promise<void> {
		let result: unknown;
		try {
			result = handle.entry(handle.ctx, handle.config);
		} catch (error) {
			return this.fail(handle, error);
		}
		if (result instanceof Promise) {
			return result.then(
				(value) => this.finish(handle, value),
				(error) => this.fail(handle, error),
			);
		}
		this.finish(handle, result);
		return Promise.resolve();
	}

	private finish(handle: PluginHandleImpl<E, S>, result: unknown): void {
		if (typeof result === "function") {
			handle.ctx.collect(result as Disposer);
		} else if (Array.isArray(result)) {
			for (const item of result) {
				if (typeof item === "function") handle.ctx.collect(item);
			}
		}
		handle.setState("active");
		handle.settleReady();
	}

	private fail(handle: PluginHandleImpl<E, S>, error: unknown): Promise<void> {
		// Roll back whatever the entry registered before throwing.
		handle.setState("failed");
		handle.settleFailed(error);
		return handle.ctx.dispose().then(() => {
			this.onError(error);
		});
	}
}

// ============================================================================
// Handle implementation
// ============================================================================

class PluginHandleImpl<E extends object, S extends object> implements PluginHandle<E, S> {
	readonly id: string;
	readonly manifest: PluginManifest<S>;
	readonly entry: PluginEntry<E, S>;
	readonly config: unknown;
	readonly ctx: PluginContext<E, S>;

	state: PluginState = "pending";
	/** Injected services still missing while pending (diagnostics). */
	pendingOn: string[] | undefined;

	private readonly registry: PluginRegistry<E, S>;
	private readyResolve!: () => void;
	private readyReject!: (error: unknown) => void;
	private readonly readyPromise: Promise<void>;

	constructor(
		registry: PluginRegistry<E, S>,
		manifest: PluginManifest<S>,
		entry: PluginEntry<E, S>,
		config: unknown,
		ctx: PluginContext<E, S>,
	) {
		this.registry = registry;
		this.manifest = manifest;
		this.entry = entry;
		this.config = config;
		this.ctx = ctx;
		this.id = manifest.id;
		this.readyPromise = new Promise<void>((resolve, reject) => {
			this.readyResolve = resolve;
			this.readyReject = reject;
		});
	}

	ready(): Promise<void> {
		return this.readyPromise;
	}

	async dispose(): Promise<void> {
		if (this.state === "disposed") return;
		if (this.state === "pending") {
			// Never activated: nothing to unwind, but waiting callers must
			// not hang forever.
			this.readyReject(new PluginError(`plugin "${this.id}" was disposed while pending`));
		}
		this.registry.disposeHandle(this);
		this.setState("disposed");
		await this.ctx.dispose();
	}

	async reload(config?: unknown): Promise<PluginHandle<E, S>> {
		await this.dispose();
		return this.registry.load(this.manifest, this.entry, config);
	}

	setState(state: PluginState): void {
		this.state = state;
	}

	settleReady(): void {
		this.readyResolve();
	}

	settleFailed(error: unknown): void {
		this.readyReject(error);
	}
}
