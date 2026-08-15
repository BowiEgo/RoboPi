import { Check, ChevronsUpDown, Search } from "lucide-solid";
import { type Component, createEffect, createMemo, createSignal, For, type JSX, Show } from "solid-js";

import { cstyle } from "@/utils/cstyle";

export interface DropdownOption {
	id: string;
	name: string;
	/** Optional group label — consecutive options with the same group render under one header. */
	group?: string;
	/** Optional extra search keywords for the group (e.g. other-language terms). */
	groupSearch?: string;
	/** Optional icon rendered next to the group label. */
	groupIcon?: JSX.Element;
	/** Optional icon rendered before the option name. */
	icon?: JSX.Element;
}

export interface DropdownProps {
	value: string;
	options: DropdownOption[];
	placeholder: string;
	searchable?: boolean;
	/** Menu width (CSS value). Defaults to the trigger's width. */
	width?: string;
	/** Menu popup direction. Default "down" (below the trigger). */
	direction?: "up" | "down";
	/** Replace the trigger's default style (used to match surrounding buttons). */
	triggerClass?: string;
	/** Called when the highlight moves (keyboard/hover) without selecting. */
	onPreview?: (id: string) => void;
	/** Called when the menu closes without selecting (Escape / click outside). */
	onClose?: () => void;
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
		sizing: "w-full",
		interaction: "rounded-lg border shadow-xl",
		color: "border-base-300 bg-base-100",
		variants: {
			direction: {
				up: "bottom-full mb-1",
				down: "top-full mt-1",
			},
		},
	}),
	searchRow: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-3 py-2",
		interaction: "border-none",
		color: "border-base-200",
	}),
	searchInput: cstyle({
		display: "flex-1",
		interaction: "bg-transparent outline-none",
		text: "text-sm",
		color: "placeholder:text-base-content/30",
	}),
	optionsList: cstyle({
		display: "flex flex-col",
		sizing: "max-h-66 overflow-y-auto",
		spacing: "p-1 pt-0",
		interaction: "rounded-b-lg",
		color: "bg-base-200",
	}),
	groupLabel: cstyle({
		display: "sticky top-0 z-10 flex items-center",
		spacing: "px-3 py-1.5 gap-1.5",
		text: "text-[11px] font-semibold uppercase tracking-wider",
		interaction: "border-b",
		color: "bg-base-200 border-base-300 text-base-content/60",
	}),
	option: cstyle({
		display: "flex items-center justify-between",
		sizing: "w-full",
		spacing: "px-3 py-2",
		text: "text-sm",
		interaction: "transition-colors rounded-md",
		variants: {
			selected: {
				true: "bg-primary/10 text-primary",
				false: "hover:bg-base-300 text-base-content",
			},
		},
	}),
};

/**
 * Searchable dropdown with click-outside close, keyboard navigation, and
 * optional grouping (via DropdownOption.group).
 */
const Dropdown: Component<DropdownProps> = (props) => {
	const [open, setOpen] = createSignal(false);
	const [search, setSearch] = createSignal("");
	const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
	let containerRef: HTMLDivElement | undefined;
	// Whether the current highlight came from keyboard navigation (scroll) or mouse hover (no scroll).
	let highlightByKeyboard = true;
	// Suppress mouse-enter events right after keyboard navigation — scrollIntoView
	// can move options under a stationary cursor and fire a spurious mouseenter.
	let suppressHover = false;

	const filtered = createMemo(() => {
		const q = search().toLowerCase();
		if (!q) return props.options;
		return props.options.filter(
			(o) =>
				o.name.toLowerCase().includes(q) ||
				o.id.toLowerCase().includes(q) ||
				(o.group?.toLowerCase().includes(q) ?? false) ||
				(o.groupSearch?.toLowerCase().includes(q) ?? false),
		);
	});

	// Group consecutive options sharing the same `group` label, while keeping
	// each option's global index for keyboard navigation / scroll sync.
	const grouped = createMemo(() => {
		const items = filtered();
		const result: { label: string; icon?: JSX.Element; options: { opt: DropdownOption; index: number }[] }[] = [];
		let current: { label: string; icon?: JSX.Element; options: { opt: DropdownOption; index: number }[] } | null = null;
		items.forEach((opt, index) => {
			const label = opt.group ?? "";
			if (!current || current.label !== label) {
				current = { label, icon: opt.groupIcon, options: [] };
				result.push(current);
			}
			current.options.push({ opt, index });
		});
		return result;
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
		if (items.length === 0) {
			if (e.key === "Escape") {
				setOpen(false);
				props.onClose?.();
			}
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			highlightByKeyboard = true;
			suppressHover = true;
			const next = highlightedIndex() + 1 >= items.length ? 0 : highlightedIndex() + 1;
			setHighlightedIndex(next);
			props.onPreview?.(items[next].id);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			highlightByKeyboard = true;
			suppressHover = true;
			const next = highlightedIndex() - 1 < 0 ? items.length - 1 : highlightedIndex() - 1;
			setHighlightedIndex(next);
			props.onPreview?.(items[next].id);
		} else if (e.key === "Enter") {
			const idx = highlightedIndex();
			if (idx >= 0 && idx < items.length) {
				e.preventDefault();
				select(items[idx].id);
			}
		} else if (e.key === "Escape") {
			setOpen(false);
			props.onClose?.();
		}
	}

	createEffect(() => {
		// Reset keyboard highlight whenever the menu opens.
		if (open()) setHighlightedIndex(-1);
	});

	createEffect(() => {
		// Keep the keyboard-highlighted option visible while browsing.
		// Mouse hover updates the highlight too, but must not scroll the menu.
		const idx = highlightedIndex();
		if (idx < 0 || !containerRef || !highlightByKeyboard) return;
		queueMicrotask(() => {
			containerRef?.querySelector(`[data-option-index="${idx}"]`)?.scrollIntoView({ block: "nearest" });
		});
	});

	createEffect(() => {
		if (!open()) return;
		const handler = (e: MouseEvent) => {
			if (containerRef && !containerRef.contains(e.target as Node)) {
				setOpen(false);
				setSearch("");
				props.onClose?.();
			}
		};
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	});

	return (
		<div class={C.container()} ref={containerRef} onMouseMove={() => {
			suppressHover = false;
		}}>
			<button
				type="button"
				class={props.triggerClass ?? C.trigger({ hasValue: !!props.value })}
				onClick={() => setOpen((v) => !v)}
			>
				<span class="truncate">{selectedName()}</span>
				<ChevronsUpDown class="w-3.5 h-3.5 shrink-0 opacity-40" />
			</button>
			<Show when={open()}>
				<div class={C.menu({ direction: props.direction ?? "down" })} style={{ width: props.width ?? "100%" }}>
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
						<For each={grouped()}>
							{(group) => (
								<>
									<Show when={group.label}>
										<div class={C.groupLabel()}>
											<span class="inline-flex -translate-y-px">{group.icon}</span>
											<span class="leading-none">{group.label}</span>
										</div>
									</Show>
									<For each={group.options}>
										{({ opt, index }) => (
											<button
												type="button"
												data-option-index={index}
												class={`${C.option({ selected: props.value === opt.id })} ${
													highlightedIndex() === index ? "bg-base-300" : ""
												}`}
												onMouseEnter={() => {
													if (suppressHover) return;
													highlightByKeyboard = false;
													setHighlightedIndex(index);
												}}
												onClick={() => select(opt.id)}
											>
												<span class="flex items-center gap-2 min-w-0">
													{opt.icon}
													<span class="truncate">{opt.name}</span>
												</span>
												<Show when={props.value === opt.id}>
													<Check class="w-3.5 h-3.5 shrink-0" />
												</Show>
											</button>
										)}
									</For>
								</>
							)}
						</For>
					</div>
				</div>
			</Show>
		</div>
	);
};

export default Dropdown;
