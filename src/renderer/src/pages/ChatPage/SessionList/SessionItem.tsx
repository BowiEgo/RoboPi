import { Ellipsis } from "lucide-solid";
import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import { define } from "@/utils/cx";

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

// ── Layout ──

const row = define({ base: "list-row items-center gap-2 px-3 py-2 mb-2 cursor-pointer rounded-md transition-colors" });
const content = "list-col-grow flex flex-col min-w-0";
const titleRow = "flex items-center gap-2";
const titleText = "text-sm font-medium truncate";
const timeText = "text-[10px] ml-auto";
const subtitleText = "list-col-wrap text-xs";
const ellipsisWrapper = "relative shrink-0 self-center";
const ellipsisBtn = "btn btn-ghost btn-xs btn-square";
const menuDropdown = "absolute right-0 top-full z-50 mt-1 flex flex-col py-1 min-w-36 rounded-md shadow-lg border";
const menuSeparator = "h-px my-1";
const deleteBanner = "flex items-center gap-2 px-3 py-2 rounded-md";
const renameInput = "w-full text-sm border rounded px-1 py-0.5 outline-none";
const deleteBannerText = "flex-1 text-xs";
const deleteBannerActions = "flex items-center gap-1";

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
			class={`${row()} ${props.active ? "bg-primary text-primary-content" : "hover:bg-base-200 text-base-content/70"}`}
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

			<div class={content}>
				<div class={titleRow}>
					<Show
						when={editingName() !== null}
						fallback={
							<span
								class={`${titleText} ${props.active ? "text-primary-content" : "text-base-content/80"}`}
							>
								{props.label}
							</span>
						}
					>
						<input
							ref={renameEl}
							type="text"
							class={`${renameInput} bg-app border-primary`}
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
					{props.time && (
						<span
							class={`${timeText} text-base-content/30 ${props.active ? "text-primary-content/60" : "text-base-content/40"}`}
						>
							{props.time}
						</span>
					)}
				</div>
				{props.subtitle && (
					<p
						class={`${subtitleText} ${props.active ? "text-primary-content/60" : "text-base-content/50"}`}
					>
						{props.subtitle}
					</p>
				)}
			</div>

			<div class={ellipsisWrapper}>
				<button
					type="button"
					class={`${ellipsisBtn} ${props.active ? "text-primary-content/60 hover:bg-primary/75" : "text-base-content/40"}`}
					aria-label="Session menu"
					onClick={toggleMenu}
				>
					<Ellipsis class="w-4 h-4" />
				</button>
				<Show when={menuOpen()}>
					<div ref={menuRef} class={`${menuDropdown} bg-app-elevated border-card`}>
						<button
							type="button"
							class="btn btn-ghost btn-sm justify-start rounded-none text-card-btn"
							onClick={handleRename}
						>
							{t("chat.rename")}
						</button>
						<div class={`${menuSeparator} border-card`} />
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
				<div class={`${deleteBanner} bg-card-hover`}>
					<span class={`${deleteBannerText} text-card-subtitle`}>{t("chat.deleteActiveHint")}</span>
					<div class={deleteBannerActions}>
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
