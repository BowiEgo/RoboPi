import { Ellipsis } from "lucide-solid";
import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import { cx } from "@/utils/cx";

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

const C = {
	row: {
		display: "list-row items-center",
		spacing: "gap-2 px-3 py-2 mb-2",
		interaction: "cursor-pointer rounded-md transition-colors",
		color: { active: "bg-primary/80", idle: "hover:bg-base-300/30" },
		colorDark: { active: "bg-primary/60", idle: "" },
	},
	checkbox: { display: "checkbox checkbox-xs checkbox-primary" },
	content: { display: "list-col-grow flex flex-col", sizing: "min-w-0" },
	titleRow: { display: "flex items-center", spacing: "gap-2" },
	title: {
		text: "text-sm font-medium truncate",
		color: { active: "text-neutral-100", idle: "text-neutral-500" },
		colorDark: { active: "text-white/80", idle: "text-white/80" },
	},
	time: { text: "text-[10px] ml-auto", color: "text-base-content/30" },
	subtitle: {
		display: "list-col-wrap",
		text: "text-xs",
		color: { active: "text-neutral-300", idle: "text-neutral-400" },
		colorDark: { active: "text-neutral-300", idle: "text-neutral-300" },
	},
	ellipsisWrapper: { display: "relative shrink-0 self-center" },
	ellipsisBtn: { display: "btn btn-ghost btn-xs btn-square", color: "dark:text-white" },
	renameInput: {
		sizing: "w-full",
		text: "text-sm",
		interaction: "bg-app border border-primary rounded px-1 py-0.5 outline-none",
	},
	menuDropdown: {
		display: "absolute flex flex-col",
		spacing: "right-0 top-full z-50 mt-1 py-1 min-w-36",
		interaction: "bg-base-200 rounded-md shadow-lg border border-base-300",
		colorDark: "border-gray-700",
	},
	menuSeparator: { sizing: "h-px", spacing: "my-1", interaction: "bg-base-300" },
	deleteBanner: { display: "flex items-center", spacing: "gap-2 px-3 py-2", interaction: "bg-base-200 rounded-md" },
	deleteBannerText: { sizing: "flex-1", text: "text-xs", color: "text-base-content/70" },
	deleteBannerActions: { display: "flex items-center", spacing: "gap-1" },
};

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
	let renameInput: HTMLInputElement | undefined;
	createEffect(() => {
		if (editingName() !== null && renameInput) {
			renameInput.focus();
			renameInput.select();
		}
	});
	function commitRename() {
		const name = editingName();
		if (name?.trim() && name.trim() !== props.label) props.onRename?.(props.id, name.trim());
		setEditingName(null);
	}

	return (
		<div
			class={cx(C.row, { active: props.active ?? false, idle: !(props.active ?? false) })}
			role="tab"
			tabIndex={props.active ? 0 : -1}
			onClick={() => props.onClick?.(props.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter") props.onClick?.(props.id);
			}}
		>
			{props.selectionMode && (
				<input type="checkbox" class={cx(C.checkbox)} checked={props.selected} aria-label={props.label} tabIndex={-1} />
			)}

			<div class={cx(C.content)}>
				<div class={cx(C.titleRow)}>
					<Show
						when={editingName() !== null}
						fallback={
							<span class={cx(C.title, { active: props.active ?? false, idle: !(props.active ?? false) })}>
								{props.label}
							</span>
						}
					>
						<input
							ref={renameInput}
							type="text"
							class={cx(C.renameInput)}
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
					{props.time && <span class={cx(C.time)}>{props.time}</span>}
				</div>
				{props.subtitle && (
					<p class={cx(C.subtitle, { active: props.active ?? false, idle: !(props.active ?? false) })}>
						{props.subtitle}
					</p>
				)}
			</div>

			<div class={cx(C.ellipsisWrapper)}>
				<button type="button" class={cx(C.ellipsisBtn)} aria-label="Session menu" onClick={toggleMenu}>
					<Ellipsis class="w-4 h-4" />
				</button>
				<Show when={menuOpen()}>
					<div ref={menuRef} class={cx(C.menuDropdown)}>
						<button type="button" class="btn btn-ghost btn-sm justify-start rounded-none" onClick={handleRename}>
							{t("chat.rename")}
						</button>
						<div class={cx(C.menuSeparator)} />
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
				<div class={cx(C.deleteBanner)}>
					<span class={cx(C.deleteBannerText)}>{t("chat.deleteActiveHint")}</span>
					<div class={cx(C.deleteBannerActions)}>
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
