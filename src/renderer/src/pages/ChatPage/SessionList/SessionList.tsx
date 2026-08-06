import { Ellipsis, MessageCircle, Plus, Trash2 } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import SessionItem, { type SessionItemProps } from "./SessionItem";
import { cx } from "@/utils/cx";

const C = {
	root: { display: "flex flex-col" },
	header: { display: "flex items-center", spacing: "gap-2 px-1 py-2" },
	headerIcon: { display: "flex items-center justify-center", sizing: "w-4 h-4", color: "text-base-content/60" },
	headerTitle: {
		sizing: "flex-1",
		text: "text-xs font-semibold uppercase tracking-wider",
		color: "text-base-content/60",
	},
	headerCount: { text: "text-xs", color: "text-base-content/40" },
	actions: { display: "flex items-center", spacing: "gap-1", interaction: "relative" },
	menuDropdown: {
		display: "absolute flex flex-col",
		spacing: "right-0 top-full z-50 mt-1 py-1 min-w-32",
		interaction: "bg-base-200 rounded-md shadow-lg border border-base-300",
	},
	list: { display: "list", interaction: "bg-app rounded-box" },
	empty: { text: "text-xs", spacing: "px-1 py-4", interaction: "text-center", color: "text-base-content/40" },
	selectionBar: { display: "flex items-center justify-between", spacing: "px-1 py-2" },
	selectionText: { text: "text-xs", color: "text-base-content/60" },
};

const SessionList: Component = () => {
	const { t } = useLocale();
	const { sessions, activeId, createSession, switchSession, deleteSession, renameSession } = useAgent();
	const [confirmDelete, setConfirmDelete] = createSignal<string | null>(null);
	const [selectionMode, setSelectionMode] = createSignal(false);
	const [selected, setSelected] = createSignal<Set<string>>(new Set());
	const [menuOpen, setMenuOpen] = createSignal(false);
	let menuRef: HTMLDivElement | undefined;

	function handleDelete(id: string) {
		if (confirmDelete() === id) {
			deleteSession(id);
			setConfirmDelete(null);
		} else {
			setConfirmDelete(id);
			setTimeout(() => {
				if (confirmDelete() === id) setConfirmDelete(null);
			}, 3000);
		}
	}
	function toggleSelect(id: string) {
		setSelected((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}
	function enterSelectionMode() {
		setMenuOpen(false);
		setSelectionMode(true);
		setSelected(new Set());
	}
	function exitSelectionMode() {
		setSelectionMode(false);
		setSelected(new Set());
	}
	function bulkDelete() {
		for (const id of selected()) deleteSession(id);
		exitSelectionMode();
	}

	return (
		<section class={cx(C.root)}>
			<header class={cx(C.header)}>
				<span class={cx(C.headerIcon)}>
					<MessageCircle />
				</span>
				<span class={cx(C.headerTitle)}>{t("chat.sessions")}</span>
				<span class={cx(C.headerCount)}>{sessions().length}</span>
				<div class={cx(C.actions)}>
					{selectionMode() ? (
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-square text-error"
							aria-label={t("chat.deleteSelected")}
							disabled={selected().size === 0}
							onClick={bulkDelete}
						>
							<Trash2 class="w-4 h-4" />
						</button>
					) : (
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-square"
							aria-label={t("chat.addSession")}
							onClick={() => createSession()}
						>
							<Plus />
						</button>
					)}
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-square"
						aria-label="Session list menu"
						onClick={(e) => {
							e.stopPropagation();
							setMenuOpen((v) => !v);
						}}
					>
						<Ellipsis class="w-4 h-4" />
					</button>
					<Show when={menuOpen()}>
						<div ref={menuRef} class={cx(C.menuDropdown)}>
							<button
								type="button"
								class="btn btn-ghost btn-sm justify-start rounded-none"
								onClick={enterSelectionMode}
							>
								{t("chat.edit")}
							</button>
						</div>
					</Show>
				</div>
			</header>
			<div class={cx(C.list)} role="tablist">
				<Show when={sessions().length > 0} fallback={<div class={cx(C.empty)}>{t("chat.noSessions")}</div>}>
					<For each={sessions()}>
						{(item: SessionItemProps) => (
							<SessionItem
								id={item.id}
								label={item.label}
								subtitle={item.subtitle}
								time={item.time}
								status={item.status}
								active={activeId() === item.id}
								confirmDelete={confirmDelete() === item.id}
								selectionMode={selectionMode()}
								selected={selected().has(item.id)}
								onClick={() => {
									if (selectionMode()) toggleSelect(item.id);
									else switchSession(item.id);
								}}
								onDelete={() => handleDelete(item.id)}
								onDeleteImmediate={(id) => deleteSession(id)}
								onRename={(id, name) => renameSession(id, name)}
							/>
						)}
					</For>
				</Show>
			</div>
			<Show when={selectionMode()}>
				<div class={cx(C.selectionBar)}>
					<span class={cx(C.selectionText)}>
						{selected().size} {t("chat.selected")}
					</span>
					<button type="button" class="btn btn-ghost btn-xs" onClick={exitSelectionMode}>
						{t("chat.cancel")}
					</button>
				</div>
			</Show>
		</section>
	);
};

export default SessionList;
