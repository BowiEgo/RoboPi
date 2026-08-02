/**
 * Agent IPC bridge
 *
 * 封装 window.agent（preload 暴露的 Electron IPC 桥接对象）。
 * 任何需要与 Agent Host 通信的组件都可以 import 使用。
 */

export interface AgentIpc {
	send: (msg: unknown) => void;
	onMessage: (cb: (msg: unknown) => void) => () => void;
}

let cached: AgentIpc | null | undefined;

export function getAgentIpc(): AgentIpc | null {
	if (cached !== undefined) return cached;

	try {
		const w = window as Window & { agent?: AgentIpc };
		cached = w.agent ?? null;
	} catch {
		cached = null;
	}

	return cached;
}
