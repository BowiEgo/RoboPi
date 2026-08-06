/**
 * Tailwind safelist — all dynamic class values used across JS objects.
 *
 * Tailwind v4 only scans `class="..."` attributes. Classes defined in
 * `define()` / `cx()` / JS objects are invisible to the scanner.
 *
 * Add any new dark: or dynamic class value here to ensure it gets generated.
 */

export const safelist = [
	// Row
	"bg-primary/60",
	"bg-primary/70",
	"bg-primary/80",
	"hover:bg-base-300/30",

	// Text
	"text-white/80",
	"text-neutral-100",
	"text-neutral-300",
	"text-neutral-400",
	"text-neutral-500",
	"text-base-content/30",
	"text-base-content/70",
	"text-black",
	"text-white",

	// Dark mode
	"dark:bg-primary/60",
	"dark:bg-primary/70",
	"dark:text-white/80",
	"dark:text-neutral-300",
	"dark:text-black",
	"dark:text-white",
	"dark:text-accent-content",
	"dark:border-gray-700",
	"dark:bg-gray-700",
	"dark:text-amber-50",
].join(" ");
