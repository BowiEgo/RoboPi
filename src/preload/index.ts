import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";

interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	platform: NodeJS.Platform;
}

interface AgentApi {
	send: (msg: unknown) => void;
	onMessage: (callback: (msg: unknown) => void) => () => void;
}

// Custom APIs for renderer
const api: WindowApi = {
	minimize: () => ipcRenderer.send("window:minimize"),
	maximize: () => ipcRenderer.send("window:maximize"),
	close: () => ipcRenderer.send("window:close"),
	platform: process.platform,
};

const agentApi: AgentApi = {
	send: (msg: unknown) => ipcRenderer.send("agent:send", msg),
	onMessage: (callback: (msg: unknown) => void) => {
		const handler = (_event: Electron.IpcRendererEvent, msg: unknown) =>
			callback(msg);
		ipcRenderer.on("agent:message", handler);
		return () => ipcRenderer.removeListener("agent:message", handler);
	},
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronAPI);
		contextBridge.exposeInMainWorld("api", api);
		contextBridge.exposeInMainWorld("agent", agentApi);
	} catch (error) {
		console.error(error);
	}
} else {
	// @ts-expect-error (define in dts)
	window.electron = electronAPI;
	// @ts-expect-error (define in dts)
	window.api = api;
	// @ts-expect-error (define in dts)
	window.agent = agentApi;
}
