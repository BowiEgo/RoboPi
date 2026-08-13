import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";

import icon from "../../resources/icon.png?asset";
import { getAuthPath, getConfigDir, getSessionsDir } from "../backend/agent/config.ts";
import { agentHostManager, setupAgentHost } from "./agent-host-manager";

function createWindow(): void {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 1920,
		height: 1080,
		show: false,
		autoHideMenuBar: true,
		...(process.platform === "darwin" ? { titleBarStyle: "hidden" as const } : { frame: false }),
		...(process.platform === "linux" ? { icon } : {}),
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
	});

	mainWindow.on("ready-to-show", () => {
		mainWindow.show();
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: "deny" };
	});

	// Window controls IPC
	ipcMain.on("window:minimize", () => {
		mainWindow?.minimize();
	});
	ipcMain.on("window:maximize", () => {
		if (mainWindow?.isMaximized()) {
			mainWindow.unmaximize();
		} else {
			mainWindow?.maximize();
		}
	});
	ipcMain.on("window:close", () => {
		mainWindow?.close();
	});

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// Remove application menu so Alt key does nothing
	Menu.setApplicationMenu(null);

	// Set app user model id for windows
	electronApp.setAppUserModelId("com.electron");

	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	// Window controls IPC handled in createWindow()

	// IPC test
	ipcMain.on("ping", () => console.log("pong"));

	// ── Agent Host ──
	setupAgentHost(ipcMain);

	// ── Settings IPC ──
	ipcMain.handle("settings:get", async () => {
		const configDir = getConfigDir();
		const sessionsDir = getSessionsDir();

		// Read API keys from credentials file
		let hasAnthropic = false;
		let hasOpenAI = false;
		try {
			const raw = await readFile(getAuthPath(), "utf-8");
			const creds = JSON.parse(raw);
			hasAnthropic = !!creds?.anthropic?.apiKey;
			hasOpenAI = !!creds?.openai?.apiKey;
		} catch {
			// credentials file doesn't exist yet
		}

		// Get available models from agent host
		const availableModels = agentHostManager.getAvailableModels?.() ?? [];
		const providerList = agentHostManager.getProviderList?.() ?? [];

		return { configDir, sessionsDir, hasAnthropic, hasOpenAI, availableModels, providerList };
	});

	ipcMain.handle("settings:setApiKey", async (_e, { provider, apiKey }: { provider: string; apiKey: string }) => {
		const authPath = getAuthPath();
		let creds: Record<string, unknown> = {};
		try {
			const raw = await readFile(authPath, "utf-8");
			creds = JSON.parse(raw);
		} catch {
			// file doesn't exist, start fresh
		}

		if (!creds[provider]) creds[provider] = {};
		(creds[provider] as Record<string, unknown>).type = "api_key";
		(creds[provider] as Record<string, unknown>).key = apiKey;

		await writeFile(authPath, JSON.stringify(creds, null, 2), "utf-8");

		// Notify agent host to set API key and reload models
		agentHostManager.send({
			id: `key-${Date.now()}`,
			type: "model:set_api_key" as any,
			payload: { provider, apiKey },
		});

		return { success: true };
	});

	ipcMain.handle("settings:refreshModels", async () => {
		return new Promise((resolve) => {
			const id = `refresh-${Date.now()}`;
			const handler = (msg: any) => {
				if (msg.id === id && msg.type === "model:refreshed") {
					resolve((msg.payload as any).models ?? []);
				}
			};
			agentHostManager.onMessage(handler);
			agentHostManager.send({
				id,
				type: "model:refresh" as any,
				payload: { force: false },
			});
			setTimeout(() => resolve([]), 10000);
		});
	});

	createWindow();

	app.on("activate", () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
