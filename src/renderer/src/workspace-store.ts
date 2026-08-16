/**
 * Workspace grouping — shared UI state (renderer-local, localStorage-backed).
 *
 * A workspace is a group of sessions shown in the sidebar. Sessions belong to
 * exactly one workspace; unassigned sessions fall into the default workspace.
 */

import { createSignal } from "solid-js";

export interface Workspace {
	id: string;
	name: string;
	/** Shell working directory for sessions in this workspace. */
	directory?: string;
	createdAt: number;
}

export const DEFAULT_WORKSPACE_ID = "default";

const STORAGE_KEY = "robo-pi-workspaces";

interface StoredState {
	workspaces: Workspace[];
	sessionWorkspace: Record<string, string>;
}

function load(): StoredState {
	const fallback: StoredState = {
		workspaces: [{ id: DEFAULT_WORKSPACE_ID, name: "", createdAt: 0 }],
		sessionWorkspace: {},
	};
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return fallback;
		const parsed = JSON.parse(saved) as Partial<StoredState>;
		const workspaces = Array.isArray(parsed.workspaces) ? (parsed.workspaces as Workspace[]) : [];
		if (!workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID)) {
			workspaces.unshift({ id: DEFAULT_WORKSPACE_ID, name: "", createdAt: 0 });
		}
		return {
			workspaces,
			sessionWorkspace: (parsed.sessionWorkspace as Record<string, string>) ?? {},
		};
	} catch {
		return fallback;
	}
}

const initial = load();

const [workspaces, setWorkspaces] = createSignal<Workspace[]>(initial.workspaces);
const [sessionWorkspace, setSessionWorkspace] = createSignal<Record<string, string>>(initial.sessionWorkspace);

function persist(): void {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ workspaces: workspaces(), sessionWorkspace: sessionWorkspace() }),
		);
	} catch {
		// Ignore storage failures.
	}
}

function uid(): string {
	return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Last path segment (directory name), cross-platform. */
function dirName(path: string): string {
	const parts = path.split(/[\\/]/).filter(Boolean);
	return parts[parts.length - 1] ?? path;
}

export function createWorkspace(directory: string, name?: string): Workspace {
	const ws: Workspace = {
		id: uid(),
		name: (name ?? dirName(directory)).trim(),
		directory,
		createdAt: Date.now(),
	};
	setWorkspaces((prev) => [...prev, ws]);
	persist();
	return ws;
}

export function renameWorkspace(id: string, name: string): void {
	setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name: name.trim() } : w)));
	persist();
}

export function deleteWorkspace(id: string): void {
	if (id === DEFAULT_WORKSPACE_ID) return;
	setWorkspaces((prev) => prev.filter((w) => w.id !== id));
	// Re-home its sessions to the default workspace.
	setSessionWorkspace((prev) => {
		const next = { ...prev };
		for (const [sessionId, workspaceId] of Object.entries(next)) {
			if (workspaceId === id) next[sessionId] = DEFAULT_WORKSPACE_ID;
		}
		return next;
	});
	persist();
}

export function assignSessionToWorkspace(sessionId: string, workspaceId: string): void {
	setSessionWorkspace((prev) => ({ ...prev, [sessionId]: workspaceId }));
	persist();
}

export function getSessionWorkspace(sessionId: string): string {
	return sessionWorkspace()[sessionId] ?? DEFAULT_WORKSPACE_ID;
}

export function workspaceName(id: string): string {
	return workspaces().find((w) => w.id === id)?.name ?? "";
}

/** Shell working directory for a workspace (undefined for the default/ungrouped workspace). */
export function workspaceDirectory(id: string): string | undefined {
	return workspaces().find((w) => w.id === id)?.directory;
}

export { workspaces };
