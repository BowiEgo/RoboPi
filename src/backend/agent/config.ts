/**
 * RoboPi config directory resolver.
 *
 * Resolution order:
 *   1. ROBOPI_HOME environment variable
 *   2. Default: ~/.robopi (Linux/macOS) or %APPDATA%/RoboPi (Windows)
 */

import { homedir } from "node:os";
import { join } from "node:path";

function defaultConfigDir(): string {
	if (process.platform === "win32") {
		const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
		return join(appData, "RoboPi");
	}
	return join(homedir(), ".robopi");
}

export function getConfigDir(): string {
	return process.env.ROBOPI_HOME ?? defaultConfigDir();
}

export function getSessionsDir(): string {
	return join(getConfigDir(), "sessions");
}

export function getSettingsDir(): string {
	return getConfigDir();
}

export function getAuthPath(): string {
	return join(getConfigDir(), "credentials.json");
}

export function getModelsPath(): string {
	return join(getConfigDir(), "models.json");
}
