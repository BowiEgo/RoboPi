import { describe, expect, it } from "vitest";

import { EventBus, isBailed, PluginContext } from "./context";
import type { Next } from "./types";

interface TestEvents {
	"user/joined": (name: string) => void;
	"counter/increment": (step: number) => unknown;
	"user/rewrite": (name: string, next: Next) => unknown;
}

const bus = () => new EventBus<TestEvents>();
const context = () => new PluginContext<TestEvents>(bus(), new Map());

describe("EventBus", () => {
	it("emit runs listeners in registration order", () => {
		const events = bus();
		const seen: string[] = [];
		events.on("user/joined", (name) => seen.push(`a:${name}`));
		events.on("user/joined", (name) => seen.push(`b:${name}`));
		events.emit("user/joined", "alice");
		expect(seen).toEqual(["a:alice", "b:alice"]);
	});

	it("on returns an idempotent removal disposer", () => {
		const events = bus();
		const seen: string[] = [];
		const remove = events.on("user/joined", (name) => seen.push(name));
		events.emit("user/joined", "one");
		remove();
		remove(); // no-op
		events.emit("user/joined", "two");
		expect(seen).toEqual(["one"]);
	});

	it("prepend registers the listener first", () => {
		const events = bus();
		const seen: string[] = [];
		events.on("user/joined", () => seen.push("a"));
		events.on("user/joined", () => seen.push("b"), { prepend: true });
		events.emit("user/joined", "x");
		expect(seen).toEqual(["b", "a"]);
	});

	it("once removes itself after the first call", () => {
		const events = bus();
		let calls = 0;
		events.once("user/joined", () => {
			calls += 1;
		});
		events.emit("user/joined", "a");
		events.emit("user/joined", "b");
		expect(calls).toBe(1);
	});

	it("parallel awaits every listener", async () => {
		const events = bus();
		let finished = 0;
		events.on("user/joined", async () => {
			await Promise.resolve();
			finished += 1;
		});
		events.on("user/joined", async () => {
			await Promise.resolve();
			finished += 1;
		});
		await events.parallel("user/joined", "alice");
		expect(finished).toBe(2);
	});

	it("serial returns the first bailed value", async () => {
		const events = bus();
		events.on("counter/increment", (step) => (step > 1 ? undefined : null));
		events.on("counter/increment", (step) => (step > 1 ? false : "ok"));
		events.on("counter/increment", () => "too-late");
		expect(await events.serial("counter/increment", 1)).toBe("ok");
		expect(await events.serial("counter/increment", 2)).toBe("too-late");
	});

	it("isBailed treats null/false/undefined as pass-through", () => {
		expect(isBailed(null)).toBe(false);
		expect(isBailed(false)).toBe(false);
		expect(isBailed(undefined)).toBe(false);
		expect(isBailed(0)).toBe(true);
		expect(isBailed("")).toBe(true);
	});

	it("waterfall composes listeners around the final next", () => {
		const events = bus();
		events.on("user/rewrite", (_name, next) => {
			const result = next();
			return `outer(${result as string})`;
		});
		events.on("user/rewrite", (_name, next) => {
			const result = next();
			return `inner(${result as string})`;
		});
		const result = events.waterfall("user/rewrite", "alice", (name) => `final(${String(name)})`);
		expect(result).toBe("outer(inner(final(alice)))");
	});

	it("waterfall can short-circuit by not calling next", () => {
		const events = bus();
		events.on("user/rewrite", (_name, _next) => "vetoed");
		events.on("user/rewrite", (_name, next) => next());
		const result = events.waterfall("user/rewrite", "alice", () => "final");
		expect(result).toBe("vetoed");
	});
});

describe("PluginContext", () => {
	it("provide/get/require resolve in the shared store", () => {
		const root = context();
		const child = root.extend();
		const service = { ping: () => "pong" };
		root.provide("counter", service);
		expect(child.get("counter")).toBe(service);
		expect(child.require("counter")).toBe(service);
		expect(child.has("counter")).toBe(true);
	});

	it("require throws when the service is missing", () => {
		const ctx = context();
		expect(() => ctx.require("counter")).toThrow(/not provided/);
	});

	it("provide throws when the key is already provided", () => {
		const ctx = context();
		ctx.provide("counter", {});
		expect(() => ctx.provide("counter", {})).toThrow(/already provided/);
	});

	it("dispose removes provided services", async () => {
		const root = context();
		const plugin = root.extend();
		plugin.provide("counter", {});
		expect(root.has("counter")).toBe(true);
		await plugin.dispose();
		expect(root.has("counter")).toBe(false);
	});

	it("dispose unwinds effects in reverse registration order", async () => {
		const ctx = context();
		const order: string[] = [];
		ctx.effect(() => {
			order.push("a:setup");
			return () => void order.push("a:cleanup");
		});
		ctx.effect(() => {
			order.push("b:setup");
			return () => void order.push("b:cleanup");
		});
		expect(order).toEqual(["a:setup", "b:setup"]);
		await ctx.dispose();
		expect(order).toEqual(["a:setup", "b:setup", "b:cleanup", "a:cleanup"]);
	});

	it("nested effects are unwound in reverse registration order", async () => {
		const ctx = context();
		const order: string[] = [];
		const outer = ctx.effect(() => {
			order.push("outer:setup");
			ctx.effect(() => {
				order.push("inner:setup");
				return () => void order.push("inner:cleanup");
			});
			// The outer disposer registers LAST, so it unwinds FIRST
			// (reverse registration order, like Cordis).
			return () => void order.push("outer:cleanup");
		});
		await outer();
		expect(order).toEqual(["outer:setup", "inner:setup", "outer:cleanup", "inner:cleanup"]);
	});

	it("event listeners registered by a child are removed on child dispose", async () => {
		const events = bus();
		const root = new PluginContext<TestEvents>(events, new Map());
		const plugin = root.extend();
		const seen: string[] = [];
		plugin.on("user/joined", (name) => seen.push(name));
		events.emit("user/joined", "before");
		await plugin.dispose();
		events.emit("user/joined", "after");
		expect(seen).toEqual(["before"]);
	});

	it("disposed context rejects new registrations", async () => {
		const ctx = context();
		await ctx.dispose();
		expect(() => ctx.provide("counter", {})).toThrow(/disposed/);
		expect(() => ctx.on("user/joined", () => {})).toThrow(/disposed/);
		expect(() => ctx.effect(() => {})).toThrow(/disposed/);
	});

	it("async effects collect disposers when the promise settles", async () => {
		const ctx = context();
		const order: string[] = [];
		ctx.effect(async () => {
			order.push("setup");
			return () => void order.push("cleanup");
		});
		await Promise.resolve();
		await ctx.dispose();
		expect(order).toEqual(["setup", "cleanup"]);
	});
});
