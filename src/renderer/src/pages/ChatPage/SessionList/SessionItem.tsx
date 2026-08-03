import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";

import { Ellipsis } from "lucide-solid";

import { useLocale } from "@/contexts/LocaleContext";

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

const SessionItem: Component<SessionItemProps> = (props) => {
	const { t } = useLocale();

	// ── Menu (replaces context menu) ──
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
		if (menuOpen()) {
			document.addEventListener("click", onDocClick);
		} else {
			document.removeEventListener("click", onDocClick);
		}
	});

	onCleanup(() => {
		document.removeEventListener("click", onDocClick);
	});

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

	// ── Rename ──
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
		if (name?.trim() && name.trim() !== props.label) {
			props.onRename?.(props.id, name.trim());
		}
		setEditingName(null);
	}

	return (
		<div
			class={`list-row items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors ${props.active ? "bg-primary/10" : "hover:bg-base-300/50"}`}
			role="tab"
			tabIndex={props.active ? 0 : -1}
			onClick={() => props.onClick?.(props.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter") props.onClick?.(props.id);
			}}
		>
			{/* Checkbox — only visible in edit mode */}
			{props.selectionMode && (
					<input
						type="checkbox"
						class="checkbox checkbox-xs checkbox-primary"
						checked={props.selected}
						aria-label={props.label}
						tabIndex={-1}
					/>
				)}

			{/* Content */}
			<div class="list-col-grow min-w-0 flex flex-col">
				<div class="flex items-center gap-2">
					<Show
						when={editingName() !== null}
						fallback={
							<span class="text-sm font-medium truncate text-base-content">
								{props.label}
							</span>
						}
					>
						<input
							ref={renameInput}
							type="text"
							class="w-full text-sm bg-base-100 border border-primary rounded px-1 py-0.5 outline-none"
							value={editingName() ?? ""}
							onInput={(e) =>
								setEditingName(e.currentTarget.value)
							}
							onBlur={commitRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") commitRename();
								if (e.key === "Escape") setEditingName(null);
							}}
							onClick={(e) => e.stopPropagation()}
						/>
					</Show>
					{props.time && (
						<span class="text-[10px] text-base-content/30 ml-auto">
							{props.time}
						</span>
					)}
				</div>
				{props.subtitle && (
					<p class="list-col-wrap text-xs text-base-content/40">
						{props.subtitle}
					</p>
				)}
			</div>

			{/* Ellipsis menu button */}
			<div class="relative shrink-0 self-center">
				<button
					type="button"
					class="btn btn-ghost btn-xs btn-square"
					aria-label="Session menu"
					onClick={toggleMenu}
				>
					<Ellipsis class="w-4 h-4" />
				</button>

				{/* Menu dropdown */}
				<Show when={menuOpen()}>
					<div
						ref={menuRef}
						class="absolute right-0 top-full z-50 mt-1 flex flex-col py-1 min-w-36 bg-base-200 rounded-md shadow-lg border border-base-300"
					>
						<button
							type="button"
							class="btn btn-ghost btn-sm justify-start rounded-none"
							onClick={handleRename}
						>
							{t("chat.rename")}
						</button>
						<div class="h-px bg-base-300 my-1" />
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

			{/* Delete confirm */}
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

			{/* Active session delete banner */}
			<Show when={pendingDelete()}>
				<div class="flex items-center gap-2 px-3 py-2 bg-base-200 rounded-md">
					<span class="flex-1 text-xs text-base-content/70">
						{t("chat.deleteActiveHint")}
					</span>
					<div class="flex items-center gap-1">
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
