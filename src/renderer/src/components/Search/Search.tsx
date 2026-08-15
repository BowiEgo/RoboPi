import { Search as SearchIcon } from "lucide-solid";
import { type Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { sessionSearchQuery, setSessionSearchQuery } from "@/session-search";

import { cstyle } from "@/utils/cstyle";

// ── Styles ──

const C = {
	wrapper: cstyle({
		display: "relative flex items-center",
		sizing: "w-full h-9",
		spacing: "px-3",
		interaction: "rounded-lg border cursor-text shadow-sm",
		color:
			"border-base-300 input-field hover:border-base-600 focus-within:border-primary/45 focus-within:ring-primary/15",
	}),
	icon: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-4 h-4 shrink-0",
		interaction: "pointer-events-none",
		color: "text-neutral-500 group-focus-within:text-primary group-focus-within:opacity-100",
	}),
	input: cstyle({
		display: "border-none outline-none bg-transparent",
		sizing: "flex-1 min-w-0 h-full",
		spacing: "px-2",
		text: "text-xs leading-none",
	}),
	shortcut: cstyle({
		display: "flex items-center",
		sizing: "shrink-0",
		spacing: "gap-1.5 px-1.5 py-1",
		interaction: "rounded pointer-events-none",
		text: "font-mono text-[12px] font-medium tracking-wider leading-none",
		color: "bg-primary text-primary-content opacity-60",
	}),
};

// ── Component ──

const Search: Component = () => {
	const { t } = useLocale();

	let inputRef: HTMLInputElement | undefined;

	return (
		<label class={`${C.wrapper()} group`}>
			<span class={C.icon()}>
				<SearchIcon class="w-full h-full" />
			</span>
			<input
				type="search"
				class={C.input()}
				ref={inputRef}
				value={sessionSearchQuery()}
				onInput={(e) => setSessionSearchQuery(e.currentTarget.value)}
				placeholder={t("search.placeholder")}
				aria-label={t("search.label")}
			/>
			<span class={C.shortcut()}>
				<span class="scale-125">⌘</span>
				<span>K</span>
			</span>
		</label>
	);
};

export default Search;
