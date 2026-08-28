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

interface SearchProps {
	/** Controlled value; defaults to the shared session search query. */
	value?: string;
	/** Controlled input; defaults to writing the session search query. */
	onInput?: (value: string) => void;
	/** Placeholder; defaults to the shared search placeholder. */
	placeholder?: string;
}

const Search: Component<SearchProps> = (props) => {
	const { t } = useLocale();

	let inputRef: HTMLInputElement | undefined;

	const value = () => props.value ?? sessionSearchQuery();
	const onInput = (v: string) => (props.onInput ? props.onInput(v) : setSessionSearchQuery(v));

	return (
		<label class={`${C.wrapper()} group`}>
			<span class={C.icon()}>
				<SearchIcon class="w-full h-full" />
			</span>
			<input
				type="search"
				class={C.input()}
				ref={inputRef}
				value={value()}
				onInput={(e) => onInput(e.currentTarget.value)}
				placeholder={props.placeholder ?? t("search.placeholder")}
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
