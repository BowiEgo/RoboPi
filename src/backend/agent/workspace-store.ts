/**
 * Workspace store — persisted grouping of sessions by shell directory.
 *
 * Backed by a JSON file under the config dir, so workspaces survive restarts
 * and can be shared across frontends (unlike renderer localStorage).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { WorkspaceRecord } from "../../shared/agent-types.ts";

export const DEFAULT_WORKSPACE_ID = "default";

function dirName(path: string): string {
	const parts = path.split(/[\\/]/).filter(Boolean);
	return parts[parts.length - 1] ?? path;
}

function uid(): string {
	return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class WorkspaceStore {
	private workspaces: WorkspaceRecord[];
	private sessionWorkspace: Map<string, string>;
	private readonly path: string;

	constructor(path: string) {
		this.path = path;
		const loaded = this.load();
		this.workspaces = loaded.workspaces;
		this.sessionWorkspace = loaded.sessionWorkspace;
	}

	private load(): { workspaces: WorkspaceRecord[]; sessionWorkspace: Map<string, string> } {
		try {
			if (existsSync(this.path)) {
				const parsed = JSON.parse(readFileSync(this.path, "utf8")) as {
					workspaces?: WorkspaceRecord[];
					sessionWorkspace?: Record<string, string>;
				};
				const workspaces = Array.isArray(parsed.workspaces) ? (parsed.workspaces as WorkspaceRecord[]) : [];
				if (!workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID)) {
					workspaces.unshift({ id: DEFAULT_WORKSPACE_ID, name: "", createdAt: 0 });
				}
				const map = new Map<string, string>();
				for (const [k, v] of Object.entries(parsed.sessionWorkspace ?? {})) {
					map.set(k, v);
				}
				return { workspaces, sessionWorkspace: map };
			}
		} catch {
			// Fall through to the default state on a corrupt/unreadable file.
		}
		return {
			workspaces: [{ id: DEFAULT_WORKSPACE_ID, name: "", createdAt: 0 }],
			sessionWorkspace: new Map(),
		};
	}

	persist(): void {
		try {
			mkdirSync(dirname(this.path), { recursive: true });
			writeFileSync(
				this.path,
				JSON.stringify(
					{
						workspaces: this.workspaces,
						sessionWorkspace: Object.fromEntries(this.sessionWorkspace),
					},
					null,
					2,
				),
			);
		} catch (err) {
			console.error("[WorkspaceStore] persist failed", err);
		}
	}

	list(): WorkspaceRecord[] {
		return this.workspaces;
	}

	listMap(): Record<string, string> {
		return Object.fromEntries(this.sessionWorkspace);
	}

	create(directory: string, name?: string): WorkspaceRecord {
		const ws: WorkspaceRecord = {
			id: uid(),
			name: (name ?? dirName(directory)).trim(),
			directory,
			createdAt: Date.now(),
		};
		this.workspaces.push(ws);
		this.persist();
		return ws;
	}

	rename(id: string, name: string): void {
		this.workspaces = this.workspaces.map((w) => (w.id === id ? { ...w, name: name.trim() } : w));
		this.persist();
	}

	remove(id: string): void {
		if (id === DEFAULT_WORKSPACE_ID) return;
		this.workspaces = this.workspaces.filter((w) => w.id !== id);
		for (const [sid, wid] of this.sessionWorkspace) {
			if (wid === id) this.sessionWorkspace.set(sid, DEFAULT_WORKSPACE_ID);
		}
		this.persist();
	}

	assign(sessionId: string, workspaceId: string): void {
		this.sessionWorkspace.set(sessionId, workspaceId);
		this.persist();
	}

	getSessionWorkspace(sessionId: string): string {
		return this.sessionWorkspace.get(sessionId) ?? DEFAULT_WORKSPACE_ID;
	}

	directory(id: string): string | undefined {
		return this.workspaces.find((w) => w.id === id)?.directory;
	}
}
