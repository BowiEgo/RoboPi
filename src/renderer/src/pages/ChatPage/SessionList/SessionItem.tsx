import { Ellipsis } from "lucide-solid";
import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import { cstyle } from "@/utils/cstyle";

export interface SessionItemProps {
	id: string;
	label: string;
	subtitle?: string;
	time?: string;
	status?: "idle" | "active" | "starting";
	active?: boolean;
	confirmDelete?: boolean;
	selectionMode?: boolean;
	selected?: boolean;
	onClick?: (id: string) => void;
	onDelete?: (id: string) => void;
	onDeleteImmediate?: (id: string) => void;
	onRename?: (id: string, name: string) => void;
}

// ── Styles ──

const C = {
	row: cstyle({
		display: "group flex items-center",
		spacing: "gap-2 px-3 py-2",
		interaction: "cursor-pointer rounded-md transition-colors",
		variants: {
			active: {
				true: "bg-primary/50",
				false: "hover:bg-base-200",
			},
		},
	}),
	content: cstyle({
		display: "flex flex-col flex-1",
		sizing: "min-w-0",
	}),
	titleRow: cstyle({
		display: "flex items-center",
		spacing: "gap-2",
	}),
	titleText: cstyle({
		text: "text-sm font-medium truncate",
		variants: {
			active: {
				true: "text-base-content/70",
				false: "text-base-content/80",
			},
		},
	}),
	timeText: cstyle({
		text: "text-[10px] text-base-content/60",
		spacing: "ml-auto",
	}),
	subtitleText: cstyle({
		text: "text-xs text-base-content/60",
	}),
	ellipsisWrapper: cstyle({
		display: "relative",
		sizing: "shrink-0 self-center",
	}),
	ellipsisBtn: cstyle({
		display: "btn btn-ghost btn-xs btn-square text-base-content/60 hover:bg-base-100 opacity-0 group-hover:opacity-100 transition-opacity",
		variants: {
			active: { true: "opacity-100" },
		},
	}),
	menuDropdown: cstyle({
		display: "absolute right-0 top-full z-50 flex flex-col",
		spacing: "mt-1 py-1",
		sizing: "min-w-36",
		interaction: "rounded-md shadow-lg border border-card",
		color: "bg-app-elevated",
	}),
	menuSeparator: cstyle({
		sizing: "h-px",
		spacing: "my-1",
		interaction: "border-card",
	}),
	deleteBanner: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-3 py-2",
		interaction: "rounded-md",
		color: "bg-card-hover",
	}),
	renameInput: cstyle({
		sizing: "w-full",
		text: "text-sm",
		interaction: "border rounded outline-none",
		spacing: "px-1 py-0.5",
		color: "bg-app border-primary",
	}),
	deleteBannerText: cstyle({
		display: "flex-1",
		text: "text-xs text-card-subtitle",
	}),
	deleteBannerActions: cstyle({
		display: "flex items-center",
		spacing: "gap-1",
	}),
};

// ── Component ──

const SessionItem: Component<SessionItemProps> = (props) => {
	const { t } = useLocale();
	const [menuOpen, setMenuOpen] = createSignal(false);
	const [pendingDelete, setPendingDelete] = createSignal(false);
	let menuRef: HTMLDivElement | undefined;

	function toggleMenu(e: MouseEvent) {
		e.stopPropagation();
		setMenuOpen((v) => !v);
	}
	function closeMenu() {
		setMenuOpen(false);
	}
	function onDocClick() {
		closeMenu();
	}
	createEffect(() => {
		if (menuOpen()) document.addEventListener("click", onDocClick);
		else document.removeEventListener("click", onDocClick);
	});
	onCleanup(() => document.removeEventListener("click", onDocClick));

	function handleRename() {
		closeMenu();
		setTimeout(() => setEditingName(props.label), 50);
	}
	function handleDelete() {
		closeMenu();
		if (props.active) {
			setPendingDelete(true);
			setTimeout(() => setPendingDelete(false), 3000);
			return;
		}
		props.onDeleteImmediate?.(props.id);
	}
	function confirmDeleteActive() {
		setPendingDelete(false);
		props.onDeleteImmediate?.(props.id);
	}

	const [editingName, setEditingName] = createSignal<string | null>(null);
	let renameEl: HTMLInputElement | undefined;
	createEffect(() => {
		if (editingName() !== null && renameEl) {
			renameEl.focus();
			renameEl.select();
		}
	});
	function commitRename() {
		const name = editingName();
		if (name?.trim() && name.trim() !== props.label) props.onRename?.(props.id, name.trim());
		setEditingName(null);
	}

	return (
		<div
			class={C.row({ active: props.active })}
			role="tab"
			tabIndex={props.active ? 0 : -1}
			onClick={() => props.onClick?.(props.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter") props.onClick?.(props.id);
			}}
		>
			{props.selectionMode && (
				<input
					type="checkbox"
					class="checkbox checkbox-xs checkbox-primary"
					checked={props.selected}
					aria-label={props.label}
					tabIndex={-1}
				/>
			)}

			<div class={C.content()}>
				<div class={C.titleRow()}>
					<Show
						when={editingName() !== null}
						fallback={<span class={C.titleText({ active: props.active })}>{props.label}</span>}
					>
						<input
							ref={renameEl}
							type="text"
							class={C.renameInput()}
							value={editingName() ?? ""}
							onInput={(e) => setEditingName(e.currentTarget.value)}
							onBlur={commitRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") commitRename();
								if (e.key === "Escape") setEditingName(null);
							}}
							onClick={(e) => e.stopPropagation()}
						/>
					</Show>
					{props.time && <span class={C.timeText({ active: props.active })}>{props.time}</span>}
				</div>
				{props.subtitle && <p class={C.subtitleText({ active: props.active })}>{props.subtitle}</p>}
			</div>

			<div class={C.ellipsisWrapper()}>
				<button
					type="button"
					class={C.ellipsisBtn({ active: props.active })}
					aria-label="Session menu"
					onClick={toggleMenu}
				>
					<Ellipsis class="w-4 h-4" />
				</button>
				<Show when={menuOpen()}>
					<div ref={menuRef} class={C.menuDropdown()}>
						<button
							type="button"
							class="btn btn-ghost btn-sm justify-start rounded-none text-card-btn"
							onClick={handleRename}
						>
							{t("chat.rename")}
						</button>
						<div class={C.menuSeparator()} />
						<button
							type="button"
							class="btn btn-ghost btn-sm justify-start rounded-none text-error"
							onClick={handleDelete}
						>
							{t("chat.delete")}
						</button>
					</div>
				</Show>
			</div>

			<Show when={props.confirmDelete}>
				<button
					type="button"
					class="btn btn-error btn-xs"
					onClick={(e) => {
						e.stopPropagation();
						props.onDelete?.(props.id);
					}}
				>
					{t("chat.deleteConfirm")}
				</button>
			</Show>

			<Show when={pendingDelete()}>
				<div class={C.deleteBanner()}>
					<span class={C.deleteBannerText()}>{t("chat.deleteActiveHint")}</span>
					<div class={C.deleteBannerActions()}>
						<button
							type="button"
							class="btn btn-ghost btn-xs"
							onClick={(e) => {
								e.stopPropagation();
								setPendingDelete(false);
							}}
						>
							{t("chat.cancel")}
						</button>
						<button
							type="button"
							class="btn btn-error btn-xs"
							onClick={(e) => {
								e.stopPropagation();
								confirmDeleteActive();
							}}
						>
							{t("chat.delete")}
						</button>
					</div>
				</div>
			</Show>
		</div>
	);
};

export default SessionItem;
