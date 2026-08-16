import { join } from "node:path";

import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";

import icon from "../../resources/icon.png?asset";
import { setupAgentHost } from "./agent-host-manager";
import { setupSettings } from "./settings";

function createWindow(): void {
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

	// Directory picker for workspace creation.
	ipcMain.handle("dialog:select-directory", async () => {
		const result = await dialog.showOpenDialog(mainWindow, {
			title: "Select workspace directory",
			properties: ["openDirectory", "createDirectory"],
		});
		if (result.canceled || result.filePaths.length === 0) return null;
		return result.filePaths[0];
	});

	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}
}

app.whenReady().then(() => {
	// Remove the application menu so Alt does nothing.
	Menu.setApplicationMenu(null);

	// Set app user model id for Windows.
	electronApp.setAppUserModelId("com.electron");

	// Open/close DevTools via F12 in development; ignore Cmd/Ctrl+R in production.
	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	setupAgentHost(ipcMain);
	setupSettings(ipcMain);

	createWindow();

	app.on("activate", () => {
		// On macOS, re-create a window when the dock icon is clicked and none remain.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
