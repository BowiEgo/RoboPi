import { ChevronDown, ChevronRight, Ellipsis, Folder, Plus } from "lucide-solid";
import { type Component, createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";

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
	type Workspace,
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
	// ── Delete confirmation banner ──
	confirmBanner: cstyle({
		display: "flex flex-col",
		spacing: "gap-2 px-3 py-2 my-0.5 ml-4",
		interaction: "rounded-md",
		color: "bg-base-200",
	}),
	confirmText: cstyle({ text: "text-xs text-base-content/60" }),
	confirmActions: cstyle({ display: "flex items-center", spacing: "gap-1" }),
	// ── Tooltip ──
	tooltip: cstyle({
		display: "fixed z-50 flex flex-col",
		spacing: "gap-1 px-3 py-2",
		interaction: "rounded-md shadow-lg pointer-events-none",
		text: "text-xs",
		color: "bg-base-300 text-base-content",
	}),
	tooltipDir: cstyle({ text: "font-mono text-[11px]", color: "text-base-content/70" }),
	tooltipTime: cstyle({ text: "text-[11px]", color: "text-base-content/50" }),
	// ── Menus ──
	menuWrap: cstyle({ display: "relative" }),
	menuDropdown: cstyle({
		display: "absolute right-0 top-full z-50 flex flex-col",
		spacing: "mt-1 py-1",
		sizing: "min-w-32",
		interaction: "rounded-md shadow-lg border",
		color: "bg-app border-base-300",
	}),
	menuBtn: cstyle({
		display: "btn btn-ghost btn-sm justify-start rounded-none text-base-content",
	}),
};

// ── Helpers ──

async function selectDirectory(promptText: string): Promise<string | null> {
	if (window.api) {
		return (await window.api.invoke("dialog:select-directory")) as string | null;
	}
	// Web fallback (no Electron dialog).
	return window.prompt(promptText) ?? null;
}

function fmtTime(ms: number): string {
	if (!ms) return "—";
	return new Date(ms).toLocaleString();
}

// ── Component ──

const WorkspaceList: Component = () => {
	const { t } = useLocale();
	const { sessions, activeId, createSession, switchSession, deleteSession, renameSession } = useAgent();

	const [collapsed, setCollapsed] = createSignal<Set<string>>(new Set());
	const [editingId, setEditingId] = createSignal<string | null>(null);
	const [editingName, setEditingName] = createSignal("");
	const [menuId, setMenuId] = createSignal<string | null>(null);
	const [confirmDeleteWs, setConfirmDeleteWs] = createSignal<string | null>(null);
	const [confirmDelete, setConfirmDelete] = createSignal<string | null>(null);
	const [tooltip, setTooltip] = createSignal<{ id: string; x: number; y: number } | null>(null);
	let tooltipTimer: ReturnType<typeof setTimeout> | undefined;

	onCleanup(() => clearTimeout(tooltipTimer));

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

	async function addWorkspace() {
		const directory = await selectDirectory(t("chat.selectDirectory"));
		if (directory) createWorkspace(directory);
	}

	function commitRenameWorkspace(id: string) {
		const name = editingName().trim();
		if (name) renameWorkspace(id, name);
		setEditingId(null);
		setEditingName("");
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

	function onWsMouseEnter(e: MouseEvent, ws: Workspace) {
		if (!ws.directory) return;
		clearTimeout(tooltipTimer);
		tooltipTimer = setTimeout(() => {
			setTooltip({ id: ws.id, x: e.clientX, y: e.clientY });
		}, 1000);
	}

	function onWsMouseLeave() {
		clearTimeout(tooltipTimer);
		setTooltip(null);
	}

	const wsName = (id: string, name: string) => (id === DEFAULT_WORKSPACE_ID && !name ? t("chat.defaultWorkspace") : name);

	const tooltipWs = () => {
		const tp = tooltip();
		if (!tp) return null;
		return workspaces().find((w) => w.id === tp.id) ?? null;
	};

	return (
		<section class={C.root()}>
			<header class={C.header()}>
				<span class={C.headerTitle()}>{t("chat.workspaces")}</span>
				<span class={C.headerCount()}>{workspaces().length}</span>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-square text-base-content/50"
					aria-label={t("chat.addWorkspace")}
					onClick={() => void addWorkspace()}
				>
					<Plus class="scale-75" />
				</button>
			</header>

			<div class={C.list()}>
				<Show when={grouped().length === 0} fallback={null}>
					<div class={C.empty()}>{sessionSearchQuery() ? t("chat.noSearchResults") : t("chat.noSessions")}</div>
				</Show>

				<For each={grouped()}>
					{({ ws, items }) => (
						<div>
							<div class={C.wsRow()} onMouseEnter={(e) => onWsMouseEnter(e, ws)} onMouseLeave={onWsMouseLeave}>
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
											<Folder class="w-3.5 h-3.5 inline-block mr-1.5 -translate-y-px text-base-content/40" />
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

								<Show when={ws.id !== DEFAULT_WORKSPACE_ID}>
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
													onClick={() => {
														setMenuId(null);
														setConfirmDeleteWs(ws.id);
													}}
												>
													{t("chat.delete")}
												</button>
											</Show>
										</div>
									</Show>
								</div>
								</Show>
							</div>

							<Show when={confirmDeleteWs() === ws.id}>
								<div class={C.confirmBanner()}>
									<span class={C.confirmText()}>
										{t("chat.deleteWorkspaceHint", { name: wsName(ws.id, ws.name), ungrouped: t("chat.defaultWorkspace") })}
									</span>
									<div class={C.confirmActions()}>
										<button
											type="button"
											class="btn btn-error btn-xs"
											onClick={() => {
												deleteWorkspace(ws.id);
												setConfirmDeleteWs(null);
											}}
										>
											{t("chat.delete")}
										</button>
										<button type="button" class="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteWs(null)}>
											{t("chat.cancel")}
										</button>
									</div>
								</div>
							</Show>

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

			<Show when={tooltip()} keyed>
				{(tp) => (
					<div class={C.tooltip()} style={{ left: `${tp.x + 12}px`, top: `${tp.y + 12}px` }}>
						<span class={C.tooltipDir()}>{tooltipWs()?.directory}</span>
						<span class={C.tooltipTime()}>{fmtTime(tooltipWs()?.createdAt ?? 0)}</span>
					</div>
				)}
			</Show>
		</section>
	);
};

export default WorkspaceList;
