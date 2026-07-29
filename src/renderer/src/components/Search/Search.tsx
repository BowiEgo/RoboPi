import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Icon from "@/components/Icon";

import commandSvg from "@/assets/icons/command.svg?raw";
import searchSvg from "@/assets/icons/search.svg?raw";
import xSvg from "@/assets/icons/x.svg?raw";

import styles from "./Search.module.css";

const Search: Component = () => {
	const { t } = useLocale();
	const [value, setValue] = createSignal("");
	const [focused, setFocused] = createSignal(false);

	let inputRef: HTMLInputElement | undefined;

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		setValue(target.value);
	};

	const handleClear = () => {
		setValue("");
		inputRef?.focus();
	};

	return (
		<div
			class={`${styles.search} ${focused() ? styles.focused : ""} glass-btn`}
			role="search"
		>
			<span class={styles.icon}>
				<Icon raw={searchSvg} />
			</span>

			<input
				ref={inputRef}
				type="text"
				class={styles.input}
				value={value()}
				onInput={handleInput}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				placeholder={t("search.placeholder")}
				aria-label={t("search.label")}
			/>

			{value() && (
				<button
					type="button"
					class={styles.clearBtn}
					onClick={handleClear}
					aria-label={t("search.clear")}
					tabindex={-1}
				>
					<Icon raw={xSvg} />
				</button>
			)}

			{!value() && (
				<kbd class={styles.shortcut}>
					<span class={styles.cmdIcon}>
						<Icon raw={commandSvg} />
					</span>
					K
				</kbd>
			)}
		</div>
	);
};

export default Search;
