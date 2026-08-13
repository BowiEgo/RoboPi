import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";

import type { AgentApi, WindowApi } from "./index.d";

// Custom APIs for renderer
const api: WindowApi = {
	minimize: () => ipcRenderer.send("window:minimize"),
	maximize: () => ipcRenderer.send("window:maximize"),
	close: () => ipcRenderer.send("window:close"),
	platform: process.platform,
	invoke: (channel: string, ...args: unknown[]) =>
		ipcRenderer.invoke(channel, ...args),
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
	window.electron = electronAPI;
	window.api = api;
	window.agent = agentApi;
}
