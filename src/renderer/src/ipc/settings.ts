/**
 * Settings IPC bridge — typed access to the Electron main process.
 */

export interface SettingsInfo {
	configDir: string;
	sessionsDir: string;
	hasAnthropic: boolean;
	hasOpenAI: boolean;
	availableModels: string[];
	providerList: { id: string; name: string }[];
}

export async function getSettings(): Promise<SettingsInfo> {
	return (await window.api.invoke("settings:get")) as SettingsInfo;
}

export async function setApiKey(
	provider: string,
	apiKey: string,
): Promise<{ success: boolean }> {
	return (await window.api.invoke("settings:setApiKey", { provider, apiKey })) as {
		success: boolean;
	};
}

export async function refreshModels(): Promise<string[]> {
	return (await window.api.invoke("settings:refreshModels")) as string[];
}
