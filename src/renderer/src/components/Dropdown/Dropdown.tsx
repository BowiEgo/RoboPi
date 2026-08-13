import { Check, ChevronsUpDown, Search } from "lucide-solid";
import { type Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";

import { cstyle } from "@/utils/cstyle";

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

// ── Styles ──

const C = {
	container: cstyle({ display: "relative" }),
	trigger: cstyle({
		display: "flex items-center justify-between",
		sizing: "w-full",
		spacing: "px-3 py-2",
		text: "text-sm",
		interaction: "rounded-lg border transition-colors",
		color: "border-base-300 bg-base-200 hover:border-base-content/30",
		variants: {
			hasValue: { true: "text-base-content", false: "text-base-content/40" },
		},
	}),
	menu: cstyle({
		display: "absolute z-50",
		spacing: "mt-1",
		sizing: "w-full",
		interaction: "rounded-lg border shadow-xl",
		color: "border-base-300 bg-base-100",
	}),
	searchRow: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-3 py-2",
		interaction: "border-b",
		color: "border-base-200",
	}),
	searchInput: cstyle({
		display: "flex-1",
		interaction: "bg-transparent outline-none",
		text: "text-sm",
		color: "placeholder:text-base-content/30",
	}),
	optionsList: cstyle({
		sizing: "max-h-48 overflow-y-auto",
		spacing: "p-1",
	}),
	option: cstyle({
		display: "flex items-center justify-between",
		sizing: "w-full",
		spacing: "px-3 py-2",
		text: "text-sm",
		interaction: "rounded-md transition-colors",
		variants: {
			selected: {
				true: "bg-primary/10 text-primary",
				false: "hover:bg-base-200 text-base-content",
			},
		},
	}),
};

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
		return props.options.filter((o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
	});

	const selectedName = () => props.options.find((o) => o.id === props.value)?.name ?? props.placeholder;

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
		<div class={C.container()} ref={containerRef}>
			<button type="button" class={C.trigger({ hasValue: !!props.value })} onClick={() => setOpen((v) => !v)}>
				<span class="truncate">{selectedName()}</span>
				<ChevronsUpDown class="w-3.5 h-3.5 shrink-0 opacity-40" />
			</button>
			<Show when={open()}>
				<div class={C.menu()}>
					<Show when={props.searchable !== false}>
						<div class={C.searchRow()}>
							<Search class="w-3.5 h-3.5 text-base-content/30" />
							<input
								type="text"
								class={C.searchInput()}
								placeholder="Search..."
								value={search()}
								onInput={(e) => setSearch(e.currentTarget.value)}
							/>
						</div>
					</Show>
					<div class={C.optionsList()}>
						<For each={filtered()}>
							{(opt) => (
								<button
									type="button"
									class={C.option({ selected: props.value === opt.id })}
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
