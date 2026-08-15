/**
 * UI plugin framework — built-in view registry (scheme A).
 *
 * Plugins declare a `view` string; the renderer resolves it against this
 * static map. Plugins can never inject code — only pick a view that already
 * exists here. Add a built-in view by registering one entry.
 */

import { type Component, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { pluginInventory, toggleLocalPlugin, type InventoryItem } from "@/ui-extensions";
import SchemaForm from "@/components/SchemaForm/SchemaForm";
import { cstyle } from "@/utils/cstyle";
import ThemeSwitcher from "@/plugins/theme/ThemeSwitcher";

/** Built-in view: the plugin management list with enable/disable toggles. */
const PluginListView: Component = () => {
	const { updatePluginConfig, unloadPlugin, loadPlugin } = useAgent();

	function onToggle(item: InventoryItem) {
		if (item.local) toggleLocalPlugin(item.id);
		else if (item.enabled) unloadPlugin(item.id);
		else loadPlugin(item.id);
	}

	return (
		<ul class={C.list()}>
			<For each={pluginInventory()}>
				{(item) => (
					<li class={C.item()}>
						<div class={C.row()}>
							<span class={C.name()}>{item.name}</span>
							<span class={C.meta()}>{item.id}</span>
							<Show when={item.core} fallback={
								<input
									type="checkbox"
									class={C.toggle()}
									checked={item.enabled}
									onChange={() => onToggle(item)}
								/>
							}>
								<span class={C.meta()}>core</span>
							</Show>
						</div>
						<Show when={item.enabled && item.settingsSchema}>
							<SchemaForm
								schema={item.settingsSchema!}
								value={item.settingsValue}
								onChange={(v) => updatePluginConfig(item.id, v)}
							/>
						</Show>
					</li>
				)}
			</For>
		</ul>
	);
};

const C = {
	list: cstyle({
		display: "flex flex-col",
		spacing: "gap-3",
		text: "text-sm",
	}),
	item: cstyle({ display: "flex flex-col", spacing: "gap-2" }),
	row: cstyle({ display: "flex items-center", spacing: "gap-2" }),
	name: cstyle({ color: "text-base-content" }),
	meta: cstyle({ text: "text-xs", color: "text-base-content/40" }),
	toggle: cstyle({ display: "toggle toggle-sm" }),
};

/** Built-in views, keyed by the string plugins declare in `ui.view`. */
export const BUILTIN_VIEWS: Record<string, Component> = {
	"plugin-list": PluginListView,
	"theme-switcher": ThemeSwitcher,
};

/** Resolve a plugin's view string to a built-in component, if one exists. */
export function resolveView(view: string): Component | undefined {
	return BUILTIN_VIEWS[view];
}
