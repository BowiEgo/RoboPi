import { Check, ChevronsUpDown, Search } from "lucide-solid";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";

export interface DropdownOption {
	id: string;
	name: string;
}

export interface DropdownProps {
	value: string;
	options: DropdownOption[];
	placeholder: string;
	searchable?: boolean;
	onChange: (id: string) => void;
}

/**
 * Searchable dropdown with click-outside close and optional filtering.
 */
const Dropdown: Component<DropdownProps> = (props) => {
	const [open, setOpen] = createSignal(false);
	const [search, setSearch] = createSignal("");
	let containerRef: HTMLDivElement | undefined;

	const filtered = createMemo(() => {
		const q = search().toLowerCase();
		if (!q) return props.options;
		return props.options.filter(
			(o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
		);
	});

	const selectedName = () =>
		props.options.find((o) => o.id === props.value)?.name ?? props.placeholder;

	createEffect(() => {
		if (!open()) return;
		const handler = (e: MouseEvent) => {
			if (containerRef && !containerRef.contains(e.target as Node)) {
				setOpen(false);
				setSearch("");
			}
		};
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	});

	return (
		<div class="relative" ref={containerRef}>
			<button
				type="button"
				class={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border border-base-300 bg-base-200 hover:border-base-content/30 transition-colors ${
					props.value ? "text-base-content" : "text-base-content/40"
				}`}
				onClick={() => setOpen((v) => !v)}
			>
				<span class="truncate">{selectedName()}</span>
				<ChevronsUpDown class="w-3.5 h-3.5 shrink-0 opacity-40" />
			</button>
			<Show when={open()}>
				<div class="absolute z-50 mt-1 w-full rounded-lg border border-base-300 bg-base-100 shadow-xl">
					<Show when={props.searchable !== false}>
						<div class="flex items-center gap-2 px-3 py-2 border-b border-base-200">
							<Search class="w-3.5 h-3.5 text-base-content/30" />
							<input
								type="text"
								class="flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/30"
								placeholder="Search..."
								value={search()}
								onInput={(e) => setSearch(e.currentTarget.value)}
							/>
						</div>
					</Show>
					<div class="max-h-48 overflow-y-auto p-1">
						<For each={filtered()}>
							{(opt) => (
								<button
									type="button"
									class={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
										props.value === opt.id
											? "bg-primary/10 text-primary"
											: "hover:bg-base-200 text-base-content"
									}`}
									onClick={() => {
										props.onChange(opt.id);
										setOpen(false);
										setSearch("");
									}}
								>
									{opt.name}
									<Show when={props.value === opt.id}>
										<Check class="w-3.5 h-3.5" />
									</Show>
								</button>
							)}
						</For>
					</div>
				</div>
			</Show>
		</div>
	);
};

export default Dropdown;
