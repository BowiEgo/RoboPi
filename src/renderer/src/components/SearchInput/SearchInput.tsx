/**
 * SearchInput — a reusable search field with a leading search icon.
 * Extracted from the Dropdown component's search row.
 */

import { Search } from "lucide-solid";
import { type Component } from "solid-js";

import { cstyle } from "@/utils/cstyle";

export interface SearchInputProps {
	value: string;
	placeholder: string;
	onInput: (value: string) => void;
}

const C = {
	row: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-3 py-2",
		interaction: "rounded-lg border",
		color: "border-base-300 bg-base-200",
	}),
	input: cstyle({
		display: "flex-1",
		interaction: "bg-transparent outline-none",
		text: "text-sm",
		color: "placeholder:text-base-content/30",
	}),
};

const SearchInput: Component<SearchInputProps> = (props) => {
	return (
		<div class={C.row()}>
			<Search class="w-3.5 h-3.5 shrink-0 text-base-content/30" />
			<input
				type="text"
				class={C.input()}
				placeholder={props.placeholder}
				value={props.value}
				onInput={(e) => props.onInput(e.currentTarget.value)}
			/>
		</div>
	);
};

export default SearchInput;
