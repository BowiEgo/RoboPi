import { ElectronAPI } from "@electron-toolkit/preload";

export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	platform: NodeJS.Platform;
}

export interface AgentApi {
	send: (msg: unknown) => void;
	onMessage: (callback: (msg: unknown) => void) => () => void;
}

declare global {
	interface Window {
		electron: ElectronAPI;
		api: WindowApi;
		agent: AgentApi;
	}
}
