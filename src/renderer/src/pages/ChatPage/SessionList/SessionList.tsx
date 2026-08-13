import { Ellipsis, MessageCircle, Plus, Trash2 } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import SessionItem, { type SessionItemProps } from "./SessionItem";
import { define } from "@/utils/cx";

// ── Layout ──

const root = define({ base: "flex flex-col" });
const header = define({ base: "flex items-center gap-2 px-1 py-2" });
const headerIcon = "flex items-center justify-center w-4 h-4";
const headerTitle = "flex-1 text-xs font-semibold uppercase tracking-wider";
const headerCount = "text-xs";
const actions = "flex items-center gap-1 relative";
const menuDropdown = "absolute right-0 top-full z-50 mt-1 flex flex-col py-1 min-w-32 rounded-md shadow-lg border";
const list = "list rounded-box";
const empty = "text-xs px-1 py-4 text-center";
const selectionBar = "flex items-center justify-between px-1 py-2";
const selectionText = "text-xs";

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
		<section class={root()}>
			<header class={header()}>
				<span class={`${headerIcon} text-base-content/50`}>
					<MessageCircle />
				</span>
				<span class={`${headerTitle} text-base-content/50`}>{t("chat.sessions")}</span>
				<span class={`${headerCount} text-base-content/30`}>{sessions().length}</span>
				<div class={actions}>
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
							class="btn btn-ghost btn-sm btn-square text-base-content/50"
							aria-label={t("chat.addSession")}
							onClick={() => createSession()}
						>
							<Plus class="scale-75" />
						</button>
					)}
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-square text-base-content/50"
						aria-label="Session list menu"
						onClick={(e) => {
							e.stopPropagation();
							setMenuOpen((v) => !v);
						}}
					>
						<Ellipsis class="w-4 h-4" />
					</button>
					<Show when={menuOpen()}>
						<div ref={menuRef} class={`${menuDropdown} bg-app border-card`}>
							<button
								type="button"
								class="btn btn-ghost btn-sm justify-start rounded-none text-card-btn"
								onClick={enterSelectionMode}
							>
								{t("chat.edit")}
							</button>
						</div>
					</Show>
				</div>
			</header>

			<div class={`${list}`} role="tablist">
				<Show
					when={sessions().length > 0}
					fallback={<div class={`${empty} text-base-content/40`}>{t("chat.noSessions")}</div>}
				>
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
				<div class={selectionBar}>
					<span class={`${selectionText} text-base-content/60`}>
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
