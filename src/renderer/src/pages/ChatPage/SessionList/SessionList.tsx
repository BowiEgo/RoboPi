import { ChevronDown, ChevronRight, Ellipsis, FolderPlus, Plus } from "lucide-solid";
import { type Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";
import { sessionSearchQuery } from "@/session-search";
import {
	createWorkspace,
	DEFAULT_WORKSPACE_ID,
	deleteWorkspace,
	getSessionWorkspace,
	renameWorkspace,
	workspaces,
} from "@/workspace-store";

import SessionItem, { type SessionItemProps } from "./SessionItem";
import { cstyle } from "@/utils/cstyle";

// ── Styles ──

const C = {
	root: cstyle({ display: "flex flex-col" }),
	header: cstyle({ display: "flex items-center", spacing: "gap-2 px-1 py-2" }),
	headerIcon: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-4 h-4",
		color: "text-base-content/50",
	}),
	headerTitle: cstyle({
		display: "flex-1",
		text: "text-xs font-semibold uppercase tracking-wider",
		color: "text-base-content/50",
	}),
	headerCount: cstyle({ text: "text-xs", color: "text-base-content/30" }),
	list: cstyle({ display: "flex flex-col", spacing: "gap-0.5" }),
	empty: cstyle({
		text: "text-xs text-center",
		spacing: "px-1 py-4",
		color: "text-base-content/40",
	}),
	// ── Workspace row ──
	wsRow: cstyle({
		display: "flex items-center",
		spacing: "gap-1 pr-1 pl-0.5 py-1.5",
		interaction: "rounded-md",
		color: "hover:bg-base-200/60",
	}),
	wsToggle: cstyle({
		display: "btn btn-ghost btn-xs btn-square",
		color: "text-base-content/40",
	}),
	wsName: cstyle({
		display: "flex-1 min-w-0",
		text: "text-sm font-medium truncate",
		color: "text-base-content/80",
	}),
	wsCount: cstyle({ text: "text-[10px]", color: "text-base-content/30" }),
	wsAction: cstyle({
		display: "btn btn-ghost btn-xs btn-square",
		color: "text-base-content/40 hover:text-base-content",
	}),
	wsInput: cstyle({
		display: "flex-1 min-w-0",
		text: "text-sm",
		interaction: "border rounded outline-none",
		spacing: "px-1 py-0.5",
		color: "bg-app border-primary",
	}),
	wsChildren: cstyle({
		display: "flex flex-col",
		spacing: "pl-4",
	}),
	// ── Menus ──
	menuWrap: cstyle({ display: "relative" }),
	menuDropdown: cstyle({
		display: "absolute right-0 top-full z-50 flex flex-col",
		spacing: "mt-1 py-1",
		sizing: "min-w-32",
		interaction: "rounded-md shadow-lg border",
		color: "bg-app border-card",
	}),
	menuBtn: cstyle({
		display: "btn btn-ghost btn-sm justify-start rounded-none text-card-btn",
	}),
};

// ── Component ──

const WorkspaceList: Component = () => {
	const { t } = useLocale();
	const { sessions, activeId, createSession, switchSession, deleteSession, renameSession } = useAgent();

	const [collapsed, setCollapsed] = createSignal<Set<string>>(new Set());
	const [adding, setAdding] = createSignal(false);
	const [newName, setNewName] = createSignal("");
	const [editingId, setEditingId] = createSignal<string | null>(null);
	const [editingName, setEditingName] = createSignal("");
	const [menuId, setMenuId] = createSignal<string | null>(null);
	const [confirmDeleteWs, setConfirmDeleteWs] = createSignal<string | null>(null);
	const [confirmDelete, setConfirmDelete] = createSignal<string | null>(null);

	// Close the workspace menu on any outside click.
	createEffect(() => {
		if (menuId() === null) return;
		const handler = () => setMenuId(null);
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	});

	const filteredSessions = createMemo(() => {
		const q = sessionSearchQuery().trim().toLowerCase();
		const items = sessions();
		if (!q) return items;
		return items.filter(
			(item) => item.label.toLowerCase().includes(q) || (item.subtitle?.toLowerCase().includes(q) ?? false),
		);
	});

	const grouped = createMemo(() => {
		const searching = sessionSearchQuery().trim().length > 0;
		return workspaces()
			.map((ws) => ({
				ws,
				items: filteredSessions().filter((s) => getSessionWorkspace(s.id) === ws.id),
			}))
			.filter((g) => !searching || g.items.length > 0);
	});

	function toggleCollapse(id: string) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function commitAddWorkspace() {
		const name = newName().trim();
		setAdding(false);
		setNewName("");
		if (name) createWorkspace(name);
	}

	function commitRenameWorkspace(id: string) {
		const name = editingName().trim();
		if (name) renameWorkspace(id, name);
		setEditingId(null);
		setEditingName("");
	}

	function handleDeleteWorkspace(id: string) {
		setMenuId(null);
		if (confirmDeleteWs() === id) {
			deleteWorkspace(id);
			setConfirmDeleteWs(null);
		} else {
			setConfirmDeleteWs(id);
			setTimeout(() => {
				if (confirmDeleteWs() === id) setConfirmDeleteWs(null);
			}, 3000);
		}
	}

	function handleDeleteSession(id: string) {
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

	const wsName = (id: string, name: string) => (id === DEFAULT_WORKSPACE_ID && !name ? t("chat.defaultWorkspace") : name);

	return (
		<section class={C.root()}>
			<header class={C.header()}>
				<span class={C.headerIcon()}>
					<FolderPlus />
				</span>
				<span class={C.headerTitle()}>{t("chat.workspaces")}</span>
				<span class={C.headerCount()}>{workspaces().length}</span>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-square text-base-content/50"
					aria-label={t("chat.addWorkspace")}
					onClick={() => {
						setAdding(true);
						setNewName("");
					}}
				>
					<Plus class="scale-75" />
				</button>
			</header>

			<div class={C.list()}>
				<Show when={adding()}>
					<div class={C.wsRow()}>
						<input
							type="text"
							class={C.wsInput()}
							placeholder={t("chat.workspaceName")}
							value={newName()}
							ref={(el) => queueMicrotask(() => el.focus())}
							onInput={(e) => setNewName(e.currentTarget.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") commitAddWorkspace();
								if (e.key === "Escape") {
									setAdding(false);
									setNewName("");
								}
							}}
							onBlur={commitAddWorkspace}
						/>
					</div>
				</Show>

				<Show when={grouped().length === 0} fallback={null}>
					<div class={C.empty()}>{sessionSearchQuery() ? t("chat.noSearchResults") : t("chat.noSessions")}</div>
				</Show>

				<For each={grouped()}>
					{({ ws, items }) => (
						<div>
							<div class={C.wsRow()}>
								<button
									type="button"
									class={C.wsToggle()}
									aria-label={collapsed().has(ws.id) ? "Expand" : "Collapse"}
									onClick={() => toggleCollapse(ws.id)}
								>
									{collapsed().has(ws.id) ? <ChevronRight class="w-3.5 h-3.5" /> : <ChevronDown class="w-3.5 h-3.5" />}
								</button>

								<Show
									when={editingId() === ws.id}
									fallback={
										<span class={C.wsName()} onClick={() => toggleCollapse(ws.id)}>
											{wsName(ws.id, ws.name)}
										</span>
									}
								>
									<input
										type="text"
										class={C.wsInput()}
										value={editingName()}
										ref={(el) => queueMicrotask(() => el.focus())}
										onInput={(e) => setEditingName(e.currentTarget.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") commitRenameWorkspace(ws.id);
											if (e.key === "Escape") setEditingId(null);
										}}
										onBlur={() => commitRenameWorkspace(ws.id)}
										onClick={(e) => e.stopPropagation()}
									/>
								</Show>

								<span class={C.wsCount()}>{items.length}</span>

								<button
									type="button"
									class={C.wsAction()}
									aria-label={t("chat.addSession")}
									onClick={() => createSession(undefined, ws.id)}
								>
									<Plus class="w-3.5 h-3.5" />
								</button>

								<div class={C.menuWrap()}>
									<button
										type="button"
										class={C.wsAction()}
										aria-label={t("chat.workspaceMenu")}
										onClick={(e) => {
											e.stopPropagation();
											setMenuId((v) => (v === ws.id ? null : ws.id));
										}}
									>
										<Ellipsis class="w-3.5 h-3.5" />
									</button>
									<Show when={menuId() === ws.id}>
										<div class={C.menuDropdown()}>
											<button
												type="button"
												class={C.menuBtn()}
												onClick={() => {
													setMenuId(null);
													setEditingId(ws.id);
													setEditingName(ws.name);
												}}
											>
												{t("chat.rename")}
											</button>
											<Show when={ws.id !== DEFAULT_WORKSPACE_ID}>
												<button
													type="button"
													class={`${C.menuBtn()} text-error`}
													onClick={() => handleDeleteWorkspace(ws.id)}
												>
													{confirmDeleteWs() === ws.id ? t("chat.deleteConfirm") : t("chat.delete")}
												</button>
											</Show>
										</div>
									</Show>
								</div>
							</div>

							<Show when={!collapsed().has(ws.id) && items.length > 0}>
								<div class={C.wsChildren()}>
									<For each={items}>
										{(item: SessionItemProps) => (
											<SessionItem
												id={item.id}
												label={item.label}
												subtitle={item.subtitle}
												time={item.time}
												status={item.status}
												active={activeId() === item.id}
												confirmDelete={confirmDelete() === item.id}
												onClick={() => switchSession(item.id)}
												onDelete={() => handleDeleteSession(item.id)}
												onDeleteImmediate={(id) => deleteSession(id)}
												onRename={(id, name) => renameSession(id, name)}
											/>
										)}
									</For>
								</div>
							</Show>
						</div>
					)}
				</For>
			</div>
		</section>
	);
};

export default WorkspaceList;
