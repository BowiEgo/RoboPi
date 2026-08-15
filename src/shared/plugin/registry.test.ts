import { describe, expect, it } from "vitest";

import type { PluginContext } from "./context.ts";
import { type PluginManifest, PluginRegistry } from "./registry.ts";
import { number, object } from "./schema.ts";
import type { Disposer, PluginInternalEvents, PluginServices } from "./types.ts";

interface TestServices extends PluginServices {
	config: { theme: string };
	session: { id: string };
}

interface TestEvents extends PluginInternalEvents {
	"app/started": (bootTime: number) => void;
}

const registry = (onError?: (error: unknown) => void) => new PluginRegistry<TestEvents, TestServices>({ onError });

const manifest = (id: string, overrides: Partial<PluginManifest<TestServices>> = {}): PluginManifest<TestServices> => ({
	id,
	...overrides,
});

/** Record plugin: provides `session` (async entry, settles after a tick). */
async function sessionPlugin(ctx: PluginContext<TestEvents, TestServices>, config: unknown): Promise<Disposer> {
	await Promise.resolve();
	ctx.provide("session", { id: String(config) });
	return () => {};
}

/** Consumer factory: pushes what it saw on activation into `observed`. */
const makeConsumer = (observed: string[]) =>
	function consumer(ctx: PluginContext<TestEvents, TestServices>, config: unknown): void {
		const seen = ctx.get("session")?.id ?? "none";
		observed.push(`${seen}:${String(config)}`);
	};

describe("PluginRegistry", () => {
	it("synchronously activates a sync entry with no dependencies", async () => {
		const plugins = registry();
		const handle = plugins.load(manifest("a", { inject: [] }), (ctx) => {
			ctx.provide("config", { theme: "dark" });
		});
		expect(handle.state).toBe("active");
		await handle.ready();
		expect(plugins.get("a")).toBe(handle);
		expect(plugins.root.get("config")).toEqual({ theme: "dark" });
	});

	it("rejects duplicate ids", () => {
		const plugins = registry();
		plugins.load(manifest("a"), (ctx) => ctx.provide("config", { theme: "dark" }));
		expect(() => plugins.load(manifest("a"), () => {})).toThrow(/already loaded/);
	});

	it("keeps a plugin pending until its injected services are provided", async () => {
		const plugins = registry();
		const observed: string[] = [];
		const consumer = plugins.load(manifest("consumer", { inject: ["session"] }), makeConsumer(observed), "c1");
		expect(consumer.state).toBe("pending");
		expect(plugins.pendingPlugins()).toEqual(["consumer"]);

		// The provider arrives later; the consumer activates automatically.
		plugins.load(manifest("session", { provide: ["session"] }), sessionPlugin, "s1");
		await consumer.ready();
		expect(consumer.state).toBe("active");
		expect(observed).toEqual(["s1:c1"]);
		expect(plugins.pendingPlugins()).toEqual([]);
	});

	it("activates an async entry once its promise settles", async () => {
		const plugins = registry();
		const handle = plugins.load(manifest("session", { provide: ["session"] }), sessionPlugin, "s1");
		expect(handle.state).toBe("pending");
		await handle.ready();
		expect(handle.state).toBe("active");
		expect(plugins.root.get("session")).toEqual({ id: "s1" });
	});

	it("validates config against the manifest schema", () => {
		const plugins = registry();
		expect(() =>
			plugins.load(manifest("a", { Config: object({ maxTokens: number() }) }), () => {}, {
				maxTokens: "many" as unknown as number,
			}),
		).toThrow(/invalid config/);
	});

	it("rolls back partial registration and reports when the entry throws", async () => {
		const plugins = registry();
		const errors: unknown[] = [];
		const failing = new PluginRegistry<TestEvents, TestServices>({ onError: (error) => errors.push(error) });
		const handle = failing.load(manifest("a"), (ctx) => {
			ctx.provide("config", { theme: "dark" });
			throw new Error("boom");
		});
		await expect(handle.ready()).rejects.toThrow("boom");
		expect(handle.state).toBe("failed");
		expect(failing.root.has("config")).toBe(false);
		expect(errors).toHaveLength(1);
		expect((errors[0] as Error).message).toBe("boom");
		expect(plugins.pendingPlugins()).toEqual([]);
	});

	it("fails loudly when two plugins provide the same service", async () => {
		const failing = new PluginRegistry<TestEvents, TestServices>();
		failing.load(manifest("first"), (ctx) => ctx.provide("config", { theme: "dark" }));
		const second = failing.load(manifest("second"), (ctx) => ctx.provide("config", { theme: "light" }));
		await expect(second.ready()).rejects.toThrow(/already provided/);
		expect(second.state).toBe("failed");
		// The first registration is untouched.
		expect(failing.root.get("config")).toEqual({ theme: "dark" });
	});

	it("unload removes the plugin's services and listeners", async () => {
		const plugins = registry();
		plugins.load(manifest("a"), (ctx) => ctx.provide("config", { theme: "dark" }));
		await plugins.unload("a");
		expect(plugins.has("a")).toBe(false);
		expect(plugins.root.has("config")).toBe(false);
	});

	it("reload swaps config and re-activates", async () => {
		const plugins = registry();
		const seen: string[] = [];
		const first = plugins.load(
			manifest("a"),
			(ctx, config) => {
				seen.push(String(config));
				ctx.provide("config", { theme: String(config) });
			},
			"dark",
		);
		await first.ready();
		const second = await plugins.reload("a", "light");
		await second.ready();
		expect(seen).toEqual(["dark", "light"]);
		expect(plugins.root.get("config")).toEqual({ theme: "light" });
	});

	it("disposeAll unloads every plugin and the root context", async () => {
		const plugins = registry();
		plugins.load(manifest("a"), (ctx) => ctx.provide("config", { theme: "dark" }));
		await plugins.disposeAll();
		expect(plugins.list()).toEqual([]);
		expect(plugins.root.isDisposed()).toBe(true);
	});
});
