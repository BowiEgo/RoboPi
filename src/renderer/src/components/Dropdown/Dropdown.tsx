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
		sizing: "max-h-66 overflow-y-auto",
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
	const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
	let containerRef: HTMLDivElement | undefined;

	const filtered = createMemo(() => {
		const q = search().toLowerCase();
		if (!q) return props.options;
		return props.options.filter((o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
	});

	const selectedName = () => props.options.find((o) => o.id === props.value)?.name ?? props.placeholder;

	function select(id: string) {
		props.onChange(id);
		setOpen(false);
		setSearch("");
		setHighlightedIndex(-1);
	}

	function onKeyDown(e: KeyboardEvent) {
		const items = filtered();
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlightedIndex((i) => (i + 1 >= items.length ? 0 : i + 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightedIndex((i) => (i - 1 < 0 ? items.length - 1 : i - 1));
		} else if (e.key === "Enter") {
			const idx = highlightedIndex();
			if (idx >= 0 && idx < items.length) {
				e.preventDefault();
				select(items[idx].id);
			}
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	createEffect(() => {
		// Reset keyboard highlight whenever the menu opens.
		if (open()) setHighlightedIndex(-1);
	});

	createEffect(() => {
		// Keep the keyboard-highlighted option visible while browsing.
		const idx = highlightedIndex();
		if (idx < 0 || !containerRef) return;
		queueMicrotask(() => {
			containerRef
				?.querySelector(`[data-option-index="${idx}"]`)
				?.scrollIntoView({ block: "nearest" });
		});
	});

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
								ref={(el) => {
									// Auto-focus the search box as soon as the menu opens.
									queueMicrotask(() => el.focus());
								}}
								onInput={(e) => setSearch(e.currentTarget.value)}
								onKeyDown={onKeyDown}
							/>
						</div>
					</Show>
					<div class={C.optionsList()}>
						<For each={filtered()}>
							{(opt, index) => (
								<button
									type="button"
									data-option-index={index()}
									class={`${C.option({ selected: props.value === opt.id })} ${
										highlightedIndex() === index() ? "bg-base-200" : ""
									}`}
									onMouseEnter={() => setHighlightedIndex(index())}
									onClick={() => select(opt.id)}
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
