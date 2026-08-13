/**
 * Class-name utilities.
 *
 * Two helpers serve different needs:
 * - `cn()`     — merge arbitrary class strings, resolving Tailwind conflicts
 * - `cstyle()` — declare a reusable style with layered fields, variants, and
 *                dark-mode colors
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, resolving conflicts.
 *
 * Later classes override earlier ones (e.g. `p-2` then `p-4` → `p-4`). This is
 * the low-level primitive; prefer `cstyle()` for reusable styles and use `cn()`
 * for one-off conditional merging.
 *
 * @example
 *   cn("btn", "btn-primary")                       // "btn btn-primary"
 *   cn("p-2", "p-4")                               // "p-4" (conflict resolved)
 *   cn("text-sm", isActive && "text-primary")      // "text-sm text-primary"
 *   cn(["flex", ["items-center", "gap-2"]])        // nested arrays supported
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Layered class fields, grouped by semantic role.
 *
 * Each field holds one or more Tailwind classes for that concern. Dark-mode
 * classes are written inline in the relevant field using the `dark:` prefix
 * (e.g. `color: "bg-white text-black dark:bg-gray-900 dark:text-white"`).
 */
export interface ClassDef {
	/** Layout: display, flex/grid, alignment, position. */
	display?: string;
	/** Spacing: padding, margin, gap. */
	spacing?: string;
	/** Interaction: border, radius, transition, hover/active states. */
	interaction?: string;
	/** Sizing: width, height, overflow. */
	sizing?: string;
	/** Typography: font family, size, weight, line-height, text alignment. */
	text?: string;
	/** All color concerns: background, border, text, and `dark:` variants. */
	color?: string;
}

/** Flatten a ClassDef into a single class string. */
function flattenClassDef(def: ClassDef): string {
	return [
		def.display,
		def.spacing,
		def.interaction,
		def.sizing,
		def.text,
		def.color,
	]
		.filter(Boolean)
		.join(" ");
}

/** Prefix every class in a string with `dark:`. */
function prefixDark(classes: string): string {
	return classes
		.split(/\s+/)
		.filter(Boolean)
		.map((c) => `dark:${c}`)
		.join(" ");
}

/**
 * A reusable style builder returned by `cstyle()`.
 *
 * Callable with optional variant props; also exposes `.base` for the
 * un-varianted class string.
 */
export interface StyleBuilder {
	(props?: Record<string, string | boolean | undefined>): string;
	base: string;
}

/**
 * Define a reusable element style with variants and a dark-mode color field.
 *
 * Classes can be organized either as a single `base` string or as layered
 * fields (`display`, `interaction`, `color`, …). Both forms are merged.
 *
 * `darkColor` is a color-only field: every class it contains is automatically
 * prefixed with `dark:`, so you write `"bg-gray-900 text-white"` and get
 * `"dark:bg-gray-900 dark:text-white"`.
 *
 * Variant values can be plain strings or another `cstyle()` builder — the
 * builder is invoked to inline its base classes, enabling style reuse. A
 * referenced builder's `darkColor` is expanded too, so its dark-mode colors
 * carry over into the parent style.
 *
 * The returned builder:
 * - `style()`            → base + matching variant classes (merged)
 * - `style({ k: v })`    → select variant values by their key
 * - `style.base`         → just the base classes
 *
 * @example
 *   // A variant style with its own dark-mode colors
 *   const rowActive = cstyle({
 *     color: "bg-primary/80 text-white",
 *     darkColor: "bg-primary/40 text-gray-100",
 *   });
 *
 *   const row = cstyle({
 *     display: "list-row items-center gap-2",
 *     interaction: "rounded-md transition-colors",
 *     color: "bg-white text-black",
 *     darkColor: "bg-gray-900 text-white",   // → dark:bg-gray-900 dark:text-white
 *     variants: {
 *       active: {
 *         true: rowActive,                    // its darkColor expands too
 *         false: "hover:bg-base-300/30",
 *       },
 *     },
 *   });
 *
 *   row({ active: true })   // base + rowActive.base + rowActive.darkColor
 *   row({ active: false })  // base + hover:bg-base-300/30
 *
 * @remarks
 * - `base`, the layered fields, and `darkColor` are concatenated in order.
 * - Referenced builders are called with no args (their own variants are not
 *   selectable from the parent — use plain strings for that).
 */
export function cstyle<
	const V extends Record<string, Record<string, string | StyleBuilder>>,
>(config: ClassDef & { base?: string; darkColor?: string; variants?: V }): StyleBuilder {
	type VariantKey = keyof V & string;

	const layered = flattenClassDef(config);
	const dark = config.darkColor ? prefixDark(config.darkColor) : "";
	const base = [layered, config.base, dark].filter(Boolean).join(" ");

	function builder(props?: { [K in VariantKey]?: string | boolean | undefined }) {
		const parts: string[] = [base];

		if (props) {
			for (const [k, v] of Object.entries(props)) {
				const key = String(v);
				const variant = config.variants?.[k as VariantKey];
				const val = variant?.[key];
				if (val) parts.push(typeof val === "function" ? val() : val);
			}
		}

		return cn(...parts);
	}

	return Object.assign(builder, { base }) as StyleBuilder;
}
