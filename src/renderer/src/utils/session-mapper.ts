/**
 * Session → UI mapping helpers (pure functions).
 */

import type { SessionInfoPayload } from "@shared/agent-types";

import type { SessionItemProps } from "@/pages/ChatPage/SessionList/SessionItem";

export function fmtTime(ms: number): string {
	const d = new Date(ms);
	const now = new Date();
	if (d.toDateString() === now.toDateString()) {
		return d.toLocaleTimeString("zh-CN", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
	return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function sessionToItem(
	s: SessionInfoPayload,
	activeId: string | null,
): SessionItemProps {
	return {
		id: s.id,
		label: s.name,
		subtitle: s.lastMessage?.slice(0, 60) ?? undefined,
		time: fmtTime(s.lastActiveAt),
		status: s.id === activeId ? "active" : "idle",
	};
}
