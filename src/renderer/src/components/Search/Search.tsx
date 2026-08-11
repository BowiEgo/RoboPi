import { Search as SearchIcon } from "lucide-solid";
import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import { cx } from "@/utils/cx";

// ── Class constants ──

const C = {
	wrapper: {
		display: "relative flex items-center",
		sizing: "w-full h-9",
		spacing: "px-3",
		interaction: "rounded-lg border cursor-text shadow-sm",
		color:
			"border-base-300 input-field hover:border-base-600 focus-within:border-primary/45 focus-within:ring-primary/15",
	},
	icon: {
		display: "flex items-center justify-center",
		sizing: "w-4 h-4 shrink-0",
		interaction: "pointer-events-none",
		color: "text-neutral-500 group-focus-within:text-primary group-focus-within:opacity-100",
	},
	input: {
		display: "border-none outline-none bg-transparent",
		sizing: "flex-1 min-w-0 h-full",
		spacing: "px-2",
		text: "text-xs leading-none",
	},
	shortcut: {
		display: "flex items-center",
		sizing: "shrink-0",
		spacing: "gap-1.5 px-1.5 py-1",
		interaction: "rounded pointer-events-none",
		text: "font-mono text-[12px] font-medium tracking-wider leading-none",
		color: "bg-primary text-primary-content opacity-50",
	},
};

// ── Component ──

const Search: Component = () => {
	const { t } = useLocale();
	const [value, setValue] = createSignal("");

	let inputRef: HTMLInputElement | undefined;

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		setValue(target.value);
	};

	return (
		<label class={`${cx(C.wrapper)} group`}>
			<span class={cx(C.icon)}>
				<SearchIcon class="w-full h-full" />
			</span>
			<input
				type="search"
				class={cx(C.input)}
				ref={inputRef}
				value={value()}
				onInput={handleInput}
				placeholder={t("search.placeholder")}
				aria-label={t("search.label")}
			/>
			<span class={cx(C.shortcut)}>
				<span class="scale-125">⌘</span>
				<span>K</span>
			</span>
		</label>
	);
};

export default Search;
