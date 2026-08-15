/**
 * UI plugin framework — built-in view registry (scheme A).
 *
 * Plugins declare a `view` string; the renderer resolves it against this
 * static map. Plugins can never inject code — only pick a view that already
 * exists here. Add a built-in view by registering one entry.
 */

import { type Component, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { uiExtensions } from "@/ui-extensions";
import SchemaForm from "@/components/SchemaForm/SchemaForm";
import { cstyle } from "@/utils/cstyle";
import ThemeSwitcher from "@/views/ThemeSwitcher";

/** Built-in view: lists the UI extensions and renders their config forms. */
const PluginListView: Component = () => {
	const { updatePluginConfig } = useAgent();

	return (
		<ul class={C.list()}>
			<For each={uiExtensions()}>
				{(ext) => (
					<li class={C.item()}>
						<div class={C.header()}>
							<span class={C.name()}>{ext.view}</span>
							<span class={C.meta()}>by {ext.pluginId}</span>
						</div>
						<Show when={ext.settingsSchema}>
							<SchemaForm
								schema={ext.settingsSchema!}
								value={ext.settingsValue}
								onChange={(v) => updatePluginConfig(ext.pluginId, v)}
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
	header: cstyle({ display: "flex items-center", spacing: "gap-2" }),
	name: cstyle({ color: "text-base-content" }),
	meta: cstyle({ text: "text-xs", color: "text-base-content/40" }),
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
