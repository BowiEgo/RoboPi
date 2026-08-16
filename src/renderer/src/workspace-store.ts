/**
 * Workspace state — renderer view of the agent host's workspace store.
 *
 * The source of truth lives in the agent host (workspaces.json). This module
 * holds the renderer's reactive copy, updated from workspace:list_result
 * messages; operations go through useAgent → IPC → the agent host.
 */

import { createSignal } from "solid-js";

import type { WorkspaceRecord } from "@shared/agent-types";

export const DEFAULT_WORKSPACE_ID = "default";

const [workspaces, setWorkspaces] = createSignal<WorkspaceRecord[]>([]);
const [sessionWorkspace, setSessionWorkspace] = createSignal<Record<string, string>>({});

/** Replace the renderer's workspace state from a workspace:list_result payload. */
export function applyWorkspaceState(list: WorkspaceRecord[], map: Record<string, string>): void {
	setWorkspaces(list);
	setSessionWorkspace(map);
}

export function getSessionWorkspace(sessionId: string): string {
	return sessionWorkspace()[sessionId] ?? DEFAULT_WORKSPACE_ID;
}

export function workspaceDirectory(id: string): string | undefined {
	return workspaces().find((w) => w.id === id)?.directory;
}

export { workspaces };
