import { cva, type VariantProps } from "class-variance-authority";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, resolving conflicts (later classes override earlier ones).
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Define a reusable element style with variants.
 *
 * Usage:
 *   const row = define({
 *     base: "list-row items-center gap-2 rounded-md transition-colors",
 *     variants: {
 *       active: { true: "bg-primary/80", false: "hover:bg-base-300/30" },
 *     },
 *     dark: {
 *       active: { true: "dark:bg-primary/60" },
 *     },
 *   });
 *
 *   row({ active: true })   // "list-row … bg-primary/80 dark:bg-primary/60"
 *   row({ active: false })  // "list-row … hover:bg-base-300/30"
 *   row.base                // just the base classes
 *
 * "dark" variants are auto-prefixed with `dark:` and merged.
 */
export function define<
	const V extends Record<string, Record<string, string>>,
	const D extends Record<string, Record<string, string>>,
>(config: { base: string; variants?: V; dark?: D }) {
	type VariantKey = keyof V & string;

	const baseCva = cva(config.base, {
		variants: config.variants as Record<VariantKey, Record<string, string>>,
	});

	const darkCva = config.dark
		? cva("", {
				variants: Object.fromEntries(
					Object.entries(config.dark).map(([k, v]) => [
						k,
						Object.fromEntries(Object.entries(v as Record<string, string>).map(([kk, vv]) => [kk, `dark:${vv}`])),
					]),
				),
			})
		: null;

	function builder(props?: { [K in VariantKey]?: string | boolean }) {
		const normalized: Record<string, string> = {};
		if (props) {
			for (const [k, v] of Object.entries(props)) {
				normalized[k] = typeof v === "boolean" ? String(v) : v;
			}
		}
		const base = baseCva(normalized as VariantProps<typeof baseCva>);
		const dark = darkCva ? darkCva(normalized as VariantProps<typeof darkCva>) : "";
		return cn(base, dark);
	}

	// Also expose base for simple cases
	builder.base = config.base;
	return builder;
}

// Keep old cx for backward compatibility
export type ColorVal = string | Record<string, string>;
export interface ClassDef {
	display?: string;
	spacing?: string;
	interaction?: string;
	sizing?: string;
	text?: string;
	color?: ColorVal;
	colorDark?: ColorVal;
}

export function cx(def: ClassDef, states?: Record<string, boolean>): string {
	const parts: string[] = [];
	for (const k of ["display", "spacing", "interaction", "sizing", "text"]) {
		const v = def[k as keyof ClassDef] as string | undefined;
		if (v) parts.push(v);
	}
	const pick = (val: ColorVal | undefined, dark: boolean) => {
		if (!val) return;
		if (states) {
			for (const [k, on] of Object.entries(states)) {
				if (!on || typeof val === "string") continue;
				const v = val[k];
				if (v) parts.push(dark ? `dark:${v}` : v);
			}
		} else if (typeof val === "string" && val) {
			parts.push(dark ? `dark:${val}` : val);
		}
	};
	pick(def.color, false);
	pick(def.colorDark, true);
	return parts.join(" ");
}
