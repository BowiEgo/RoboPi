/**
 * UI plugin framework — renderer-local extension store.
 *
 * Two sources, merged in order:
 *   1. LOCAL — renderer built-in UI plugins (theme, pure-UI features),
 *      toggleable via toggleLocalPlugin.
 *   2. remote — backend plugins' inventory, shipped via plugin:list.
 */

import type { PluginDescriptor, UIExtensionDescriptor } from "@shared/agent-types";
import { createMemo, createSignal } from "solid-js";

import { resetThemeToDefaults } from "@/contexts/ThemeContext";

interface LocalPlugin {
	id: string;
	name: string;
	ui: UIExtensionDescriptor;
}

/** Renderer built-in UI plugins. Add a local plugin by appending here. */
const LOCAL_PLUGINS: LocalPlugin[] = [
	{
		id: "builtin:theme",
		name: "Theme",
		ui: { pluginId: "builtin:theme", slots: ["settings:general"], view: "theme-switcher", title: "Theme" },
	},
	{
		id: "builtin:test",
		name: "Test Messages",
		ui: { pluginId: "builtin:test", slots: ["chat:header"], view: "test-button", title: "Test" },
	},
];

/** Ids of locally-disabled plugins. */
const [disabledLocal, setDisabledLocal] = createSignal<Set<string>>(new Set());

/** Backend plugins' inventory, set from plugin:list. */
const [remotePlugins, setRemotePlugins] = createSignal<PluginDescriptor[]>([]);

/** All UI extensions (enabled local + enabled remote), for slot rendering. */
export const uiExtensions = createMemo<UIExtensionDescriptor[]>(() => [
	...LOCAL_PLUGINS.filter((p) => !disabledLocal().has(p.id)).map((p) => p.ui),
	...remotePlugins()
		.filter((p) => p.enabled && p.ui)
		.map((p) => ({
			pluginId: p.id,
			slots: p.ui!.slots,
			view: p.ui!.view,
			viewConfig: p.ui!.viewConfig,
			title: p.ui!.title,
			settingsSchema: p.settingsSchema,
			settingsValue: p.settingsValue,
		})),
]);

/** A plugin plus where it lives, for the management UI. */
export interface InventoryItem {
	id: string;
	name: string;
	enabled: boolean;
	local: boolean;
	/** Core plugins cannot be disabled. */
	core?: boolean;
	settingsSchema?: import("@shared/plugin/schema").SerializableSchema;
	settingsValue?: unknown;
}

/** Full plugin inventory (local + backend), for the management UI. */
export const pluginInventory = createMemo<InventoryItem[]>(() => [
	...LOCAL_PLUGINS.map((p) => ({
		id: p.id,
		name: p.name,
		enabled: !disabledLocal().has(p.id),
		local: true,
	})),
	...remotePlugins().map((p) => ({
		id: p.id,
		name: p.name,
		enabled: p.enabled,
		local: false,
		core: p.core,
		settingsSchema: p.settingsSchema,
		settingsValue: p.settingsValue,
	})),
]);

/** Update the remote (backend) plugin inventory from a plugin:list payload. */
export function setRemotePluginsList(plugins: PluginDescriptor[]): void {
	setRemotePlugins(plugins);
}

/** Toggle a renderer-local plugin on/off. */
export function toggleLocalPlugin(id: string): void {
	const wasEnabled = !disabledLocal().has(id);
	setDisabledLocal((prev) => {
		const next = new Set(prev);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	});
	// Disabling the theme plugin resets to the default light/dark themes.
	if (id === "builtin:theme" && wasEnabled) {
		resetThemeToDefaults();
	}
}
