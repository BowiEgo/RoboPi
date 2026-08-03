import { Ellipsis, MessageCircle, Plus, Trash2 } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import SessionItem, { type SessionItemProps } from "./SessionItem";

const SessionList: Component = () => {
	const { t } = useLocale();
	const {
		sessions,
		activeId,
		createSession,
		switchSession,
		deleteSession,
		renameSession,
	} = useAgent();

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
			const next = new Set<string>(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function enterSelectionMode() {
		setMenuOpen(false);
		setSelectionMode(true);
		setSelected(new Set<string>());
	}

	function exitSelectionMode() {
		setSelectionMode(false);
		setSelected(new Set<string>());
	}

	function bulkDelete() {
		const ids = selected();
		for (const id of ids) {
			deleteSession(id);
		}
		exitSelectionMode();
	}

	return (
		<section class="flex flex-col">
			<header class="flex items-center gap-2 px-1 py-2">
				<span class="flex items-center justify-center w-4 h-4 text-base-content/60">
					<MessageCircle />
				</span>
				<span class="flex-1 text-xs font-semibold uppercase tracking-wider text-base-content/60">
					{t("chat.sessions")}
				</span>
				<span class="text-xs text-base-content/40">{sessions().length}</span>
				<div class="flex items-center gap-1 relative">
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
						<div
							ref={menuRef}
							class="absolute right-0 top-full z-50 mt-1 flex flex-col py-1 min-w-32 bg-base-200 rounded-md shadow-lg border border-base-300"
						>
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

			<div class="list bg-base-100 rounded-box" role="tablist">
				<Show
					when={sessions().length > 0}
					fallback={
						<div class="text-xs text-base-content/40 px-1 py-4 text-center">
							{t("chat.noSessions")}
						</div>
					}
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
									if (selectionMode()) {
										toggleSelect(item.id);
									} else {
										switchSession(item.id);
									}
								}}
								onDelete={() => handleDelete(item.id)}
								onDeleteImmediate={(id: string) => deleteSession(id)}
								onRename={(id, name) => renameSession(id, name)}
							/>
						)}
					</For>
				</Show>
			</div>

			{/* Cancel selection */}
			<Show when={selectionMode()}>
				<div class="flex items-center justify-between px-1 py-2">
					<span class="text-xs text-base-content/60">
						{selected().size} {t("chat.selected")}
					</span>
					<button
						type="button"
						class="btn btn-ghost btn-xs"
						onClick={exitSelectionMode}
					>
						{t("chat.cancel")}
					</button>
				</div>
			</Show>
		</section>
	);
};

export default SessionList;
