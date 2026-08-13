/**
 * Settings IPC bridge
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
	return (window as any).api.invoke?.("settings:get") ?? {
		configDir: "~/.robopi",
		sessionsDir: "~/.robopi/sessions",
		hasAnthropic: false,
		hasOpenAI: false,
	};
}

export async function setApiKey(
	provider: string,
	apiKey: string,
): Promise<{ success: boolean }> {
	return (window as any).api.invoke?.("settings:setApiKey", { provider, apiKey }) ?? {
		success: false,
	};
}

export async function refreshModels(): Promise<string[]> {
	return (window as any).api.invoke?.("settings:refreshModels") ?? [];
}
