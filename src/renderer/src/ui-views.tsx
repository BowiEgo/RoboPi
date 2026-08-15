/**
 * UI plugin framework — built-in view registry (scheme A).
 *
 * Plugins declare a `view` string; the renderer resolves it against this
 * static map. Plugins can never inject code — only pick a view that already
 * exists here. Add a built-in view by registering one entry.
 */

import { type Component, For } from "solid-js";

import { uiExtensions } from "@/ui-extensions";
import ThemeSwitcher from "@/views/ThemeSwitcher";
import { cstyle } from "@/utils/cstyle";

/** Built-in view: lists the UI extensions currently registered. */
const PluginListView: Component = () => {
	return (
		<ul class={C.list()}>
			<For each={uiExtensions()}>
				{(ext) => (
					<li>
						<span class={C.name()}>{ext.view}</span>
						<span class={C.meta()}>by {ext.pluginId}</span>
					</li>
				)}
			</For>
		</ul>
	);
};

const C = {
	list: cstyle({
		display: "flex flex-col",
		spacing: "gap-1",
		text: "text-sm",
	}),
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
