/**
 * Plugin kernel — context and event bus.
 *
 * `EventBus` is the typed event backbone with four dispatch modes:
 *   - `emit`      — synchronous broadcast, listeners observe, no waiting;
 *   - `parallel`  — run all listeners concurrently, await all;
 *   - `serial`    — run in registration order until one listener bails
 *                   (returns a non-null/non-false/non-undefined value);
 *   - `waterfall` — around-middleware: each listener receives `(…args, next)`
 *                   and may delegate via `next()`, rewrite shared objects,
 *                   or short-circuit by returning without calling `next()`.
 *
 * Events are declared as FULL SIGNATURES (Cordis style): a waterfall event
 * includes its `next` continuation in the signature, a plain event does not.
 *
 * `PluginContext` is the per-plugin service view:
 *   - services are registered with `provide()` into a SHARED store (all
 *     plugins see each other's services — there is no isolation in the
 *     kernel; scoped isolation is a later-layer concern);
 *   - `effect()` is the reversible-registration primitive: it runs a body,
 *     collects every disposer produced while the body runs (including nested
 *     effects), and returns a disposer that unwinds them in reverse order;
 *   - `dispose()` unwinds every collected disposer in reverse order, then
 *     freezes the context (`PluginError` afterwards).
 *
 * This file is isomorphic (no Node imports): it runs in the Electron main
 * process, the agent-host child process, and the renderer.
 */

import {
	type Disposer,
	type Next,
	PluginError,
	type PluginEvents,
	type PluginInternalEvents,
	type PluginServices,
} from "./types";

// ============================================================================
// Event bus
// ============================================================================

/** Extract the argument tuple from a listener signature. */
type ArgsOf<F> = F extends (...args: infer A) => unknown ? A : never;

/** Extract the return type from a listener signature. */
type ReturnOf<F> = F extends (...args: unknown[]) => infer R ? R : never;

/** Listener shape accepted by `serial`/`bail`-style dispatch. */
export type SerialListener<A extends unknown[]> = (...args: A) => unknown;

/**
 * Waterfall listener: call `next()` to delegate, omit it to short-circuit.
 * `next()` takes no arguments — every listener receives the original args.
 */
export type WaterfallListener<A extends unknown[]> = (...args: [...A, next: Next]) => unknown;

/** Return whether a serial result should stop the chain (Cordis `isBailed`). */
export function isBailed(value: unknown): boolean {
	return value !== null && value !== false && value !== undefined;
}

interface Hook {
	listener: (...args: unknown[]) => unknown;
}

/**
 * Typed event bus. Listeners registered via `on()` are removed by calling
 * the returned disposer (which is idempotent).
 */
export class EventBus<E extends object = PluginInternalEvents> {
	private readonly _hooks = new Map<string, Hook[]>();

	/** Register a listener; returns an idempotent removal disposer. */
	on<K extends keyof E & string>(name: K, listener: E[K], options?: { prepend?: boolean }): Disposer {
		const hook: Hook = { listener: listener as (...args: unknown[]) => unknown };
		const hooks = this._hooks.get(name) ?? [];
		if (options?.prepend) hooks.unshift(hook);
		else hooks.push(hook);
		this._hooks.set(name, hooks);

		let removed = false;
		return () => {
			if (removed) return;
			removed = true;
			const current = this._hooks.get(name);
			if (!current) return;
			const index = current.indexOf(hook);
			if (index >= 0) current.splice(index, 1);
		};
	}

	/** Register a listener that removes itself after its first call. */
	once<K extends keyof E & string>(name: K, listener: E[K]): Disposer {
		const remove = this.on(name, ((...args: unknown[]) => {
			remove();
			return (listener as (...args: unknown[]) => unknown)(...args);
		}) as E[K]);
		return remove;
	}

	/** Synchronous broadcast. Listener errors propagate to the caller. */
	emit<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): void {
		const hooks = this._hooks.get(name);
		if (!hooks?.length) return;
		for (const hook of [...hooks]) {
			hook.listener(...(args as unknown[]));
		}
	}

	/** Run all listeners concurrently; rejects with the first error. */
	async parallel<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): Promise<void> {
		const hooks = this._hooks.get(name);
		if (!hooks?.length) return;
		await Promise.all([...hooks].map((hook) => Promise.resolve(hook.listener(...(args as unknown[])))));
	}

	/** Run listeners in order until one bails; returns the first bail value. */
	async serial<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): Promise<unknown> {
		const hooks = this._hooks.get(name);
		if (!hooks?.length) return undefined;
		for (const hook of [...hooks]) {
			const result = await hook.listener(...(args as unknown[]));
			if (isBailed(result)) return result;
		}
		return undefined;
	}

	/**
	 * Around-middleware dispatch (Cordis semantics). The event signature
	 * declares the final `next` (the built-in behavior) as its last
	 * parameter; listeners wrap the rest of the chain. `next()` takes no
	 * arguments — every listener always receives the original event args.
	 * Returns the outermost listener's return value (possibly a Promise).
	 */
	waterfall<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): ReturnOf<E[K]> {
		const params = [...args];
		const final = params.pop() as (...innerArgs: unknown[]) => unknown;
		if (typeof final !== "function") {
			throw new TypeError(`waterfall("${name as string}") requires a final next() callback`);
		}
		const chain: Array<(...innerArgs: unknown[]) => unknown> = [
			...(this._hooks.get(name) ?? []).map((hook) => hook.listener),
			final,
		];
		let index = 0;
		const next: Next = () => {
			const fn = chain[index++];
			return fn ? fn(...(params as unknown[]), next) : undefined;
		};
		return next() as ReturnOf<E[K]>;
	}

	/** Number of registered hooks for an event (diagnostics). */
	hookCount(name: string): number {
		return this._hooks.get(name)?.length ?? 0;
	}
}

// ============================================================================
// Plugin context
// ============================================================================

/**
 * The per-plugin view over a shared service store and a shared event bus.
 *
 * All contexts created from one root (via {@link PluginContext.extend}) share
 * the same store and bus: a service provided by one plugin is visible to all
 * siblings, and event listeners registered by a child context are cleaned up
 * when THAT child is disposed, not when the root is.
 */
export class PluginContext<E extends object = PluginEvents, S extends object = PluginServices> {
	/** Event bus shared with every context in the same tree. */
	readonly bus: EventBus<E>;

	private readonly store: Map<string, unknown>;
	private readonly onError: (error: unknown) => void;
	private readonly disposables: Disposer[] = [];
	private current: Disposer[] | null = null;
	private disposed = false;

	constructor(
		bus: EventBus<E>,
		store: Map<string, unknown>,
		onError: (error: unknown) => void = (error) => console.error(error),
	) {
		this.bus = bus;
		this.store = store;
		this.onError = onError;
	}

	/** Create a child context sharing this context's store and bus. */
	extend(): PluginContext<E, S> {
		return new PluginContext(this.bus, this.store, this.onError);
	}

	// ----------------------------------------------------------------------
	// Services
	// ----------------------------------------------------------------------

	/**
	 * Register a service implementation under `key` in the shared store.
	 * Throws if the key is already provided (fail loud, like Cordis).
	 * The registration is an effect: it is removed when this context is
	 * disposed, and the returned disposer removes it immediately.
	 */
	provide<K extends keyof S & string>(key: K, impl: S[K]): Disposer {
		this.assertActive();
		if (this.store.has(key)) {
			throw new PluginError(`service "${key}" is already provided`);
		}
		this.store.set(key, impl);
		let removed = false;
		const remove = () => {
			if (removed) return;
			removed = true;
			if (this.store.get(key) === impl) this.store.delete(key);
			(this.bus as unknown as EventBus<PluginInternalEvents>).emit("plugin/service-removed", key);
		};
		this.collect(remove);
		(this.bus as unknown as EventBus<PluginInternalEvents>).emit("plugin/service-provided", key);
		return remove;
	}

	/** Read a service; `undefined` when not provided. */
	get<K extends keyof S & string>(key: K): S[K] | undefined {
		return this.store.get(key) as S[K] | undefined;
	}

	/** Read a service; throws when not provided. */
	require<K extends keyof S & string>(key: K): S[K] {
		const value = this.store.get(key);
		if (value === undefined) {
			throw new PluginError(`required service "${key}" is not provided`);
		}
		return value as S[K];
	}

	/** Check whether a service is provided. */
	has(key: string): boolean {
		return this.store.has(key);
	}

	// ----------------------------------------------------------------------
	// Events (delegated to the shared bus, owned by this context)
	// ----------------------------------------------------------------------

	on<K extends keyof E & string>(name: K, listener: E[K], options?: { prepend?: boolean }): Disposer {
		this.assertActive();
		const remove = this.bus.on(name, listener, options);
		this.collect(remove);
		return remove;
	}

	once<K extends keyof E & string>(name: K, listener: E[K]): Disposer {
		this.assertActive();
		const remove = this.bus.once(name, listener);
		this.collect(remove);
		return remove;
	}

	emit<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): void {
		this.bus.emit(name, ...args);
	}

	parallel<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): Promise<void> {
		return this.bus.parallel(name, ...args);
	}

	serial<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): Promise<unknown> {
		return this.bus.serial(name, ...args);
	}

	waterfall<K extends keyof E & string>(name: K, ...args: ArgsOf<E[K]>): ReturnOf<E[K]> {
		return this.bus.waterfall(name, ...args);
	}

	// ----------------------------------------------------------------------
	// Reversible effects
	// ----------------------------------------------------------------------

	/**
	 * Register a cleanup-aware effect.
	 *
	 * The body runs immediately. Every disposer produced while the body runs
	 * — including those from nested `effect()` calls, `on()`, `provide()`,
	 * and `collect()` — is collected. The returned disposer unwinds them in
	 * reverse registration order; calling it twice is a no-op. Disposal also
	 * happens automatically when this context is disposed.
	 *
	 * The body may return a disposer or an array of disposers to add to the
	 * set, or a Promise resolving to either (collected when it settles).
	 */
	effect(
		execute:
			| (() => void)
			| (() => Disposer | Disposer[] | Promise<Disposer | Disposer[] | undefined>),
		_label?: string,
	): Disposer {
		this.assertActive();
		const previous = this.current;
		const list: Disposer[] = [];
		this.current = list;

		let returned: unknown;
		try {
			returned = execute();
		} catch (error) {
			this.current = previous;
			throw error;
		}
		this.current = previous;

		if (returned instanceof Promise) {
			void returned
				.then((value) => {
					this.pushDisposers(list, value);
				})
				.catch((error) => this.onError(error));
		} else {
			this.pushDisposers(list, returned);
		}

		let unwound = false;
		const unwinder = () => {
			if (unwound) return;
			unwound = true;
			return runReverse(list, this.onError);
		};
		// Register the unwinder into the enclosing collection, so both a
		// parent effect's disposer and this context's `dispose()` unwind it.
		if (this.current) this.current.push(unwinder);
		else this.disposables.push(unwinder);
		return unwinder;
	}

	/**
	 * Manually add a disposer to this context's cleanup set.
	 * Used by the registry for disposers returned from plugin entries.
	 */
	collect(disposer: Disposer): void {
		this.assertActive();
		(this.current ?? this.disposables).push(disposer);
	}

	/**
	 * Unwind every collected disposer in reverse registration order and
	 * freeze this context. Idempotent; safe to call multiple times.
	 */
	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		await runReverse(this.disposables, this.onError);
		this.disposables.length = 0;
	}

	/** True once `dispose()` has been called. */
	isDisposed(): boolean {
		return this.disposed;
	}

	private assertActive(): void {
		if (this.disposed) {
			throw new PluginError("cannot use a disposed plugin context");
		}
	}

	private pushDisposers(list: Disposer[], value: unknown): void {
		if (typeof value === "function") {
			list.push(value as Disposer);
		} else if (Array.isArray(value)) {
			for (const disposer of value) {
				if (typeof disposer === "function") list.push(disposer as Disposer);
			}
		}
	}
}

/** Run disposers in reverse order, collecting errors via `onError`. */
async function runReverse(list: Disposer[], onError: (error: unknown) => void): Promise<void> {
	for (const disposer of [...list].reverse()) {
		try {
			await disposer();
		} catch (error) {
			onError(error);
		}
	}
}
