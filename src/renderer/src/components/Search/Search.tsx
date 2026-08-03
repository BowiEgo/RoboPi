import { Search as SearchIcon } from "lucide-solid";
import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

const Search: Component = () => {
	const { t } = useLocale();
	const [value, setValue] = createSignal("");

	let inputRef: HTMLInputElement | undefined;

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		setValue(target.value);
	};

	return (
		<label class="input">
			<SearchIcon />
			<input
				type="search"
				class="grow"
				ref={inputRef}
				value={value()}
				onInput={handleInput}
				placeholder={t("search.placeholder")}
				aria-label={t("search.label")}
			/>
			<kbd class="kbd kbd-sm">⌘</kbd>
			<kbd class="kbd kbd-sm">K</kbd>
		</label>
	);
};

export default Search;
