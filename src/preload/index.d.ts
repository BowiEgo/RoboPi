import { ElectronAPI } from "@electron-toolkit/preload";

export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	platform: NodeJS.Platform;
}

declare global {
	interface Window {
		electron: ElectronAPI;
		api: WindowApi;
	}
}
