/**
 * UI plugin framework — built-in view registry (scheme A).
 *
 * Plugins declare a `view` string; the renderer resolves it against this
 * static map. Plugins can never inject code — only pick a view that already
 * exists here. Add a built-in view by registering one entry.
 */

import { type Component, createSignal, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";
import { pluginInventory, toggleLocalPlugin, type InventoryItem } from "@/ui-extensions";
import SearchInput from "@/components/SearchInput/SearchInput";
import SchemaForm from "@/components/SchemaForm/SchemaForm";
import { cstyle } from "@/utils/cstyle";
import ThemeSwitcher from "@/plugins/theme/ThemeSwitcher";

/** Built-in view: the plugin management list with enable/disable toggles. */
const PluginListView: Component = () => {
	const { updatePluginConfig, unloadPlugin, loadPlugin } = useAgent();
	const { t } = useLocale();
	const [search, setSearch] = createSignal("");

	const filtered = () => {
		const q = search().toLowerCase();
		const items = pluginInventory();
		if (!q) return items;
		return items.filter((p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
	};

	function onToggle(item: InventoryItem) {
		if (item.local) toggleLocalPlugin(item.id);
		else if (item.enabled) unloadPlugin(item.id);
		else loadPlugin(item.id);
	}

	return (
		<div class={C.root()}>
			<div class={C.header()}>
				<h2 class={C.title()}>{t("settings.plugins")}</h2>
				<span class={C.count()}>{pluginInventory().length}</span>
			</div>

			<SearchInput value={search()} placeholder={t("settings.pluginsSearch")} onInput={setSearch} />

			<div class={C.grid()}>
				<For each={filtered()}>
					{(item) => (
						<div class={C.card()}>
							<div class={C.cardRow()}>
								<div class={C.cardInfo()}>
									<span class={C.name()}>{item.name}</span>
									<span class={C.meta()}>{item.id}</span>
								</div>
								<Show
									when={item.core}
									fallback={
										<input
											type="checkbox"
											class={C.toggle()}
											checked={item.enabled}
											onChange={() => onToggle(item)}
										/>
									}
								>
									<input type="checkbox" class={C.toggle()} checked disabled title="core" />
								</Show>
							</div>
							<Show when={item.enabled && item.settingsSchema}>
								<SchemaForm
									schema={item.settingsSchema!}
									value={item.settingsValue}
									onChange={(v) => updatePluginConfig(item.id, v)}
								/>
							</Show>
						</div>
					)}
				</For>
			</div>

			<Show when={filtered().length === 0}>
				<p class={C.empty()}>{t("settings.pluginsEmpty")}</p>
			</Show>
		</div>
	);
};

const C = {
	root: cstyle({ display: "flex flex-col", spacing: "gap-3" }),
	header: cstyle({ display: "flex items-center", spacing: "gap-2" }),
	title: cstyle({
		text: "font-mono text-[14px] font-medium uppercase tracking-wider",
		color: "text-base-content/80",
	}),
	count: cstyle({
		text: "text-xs font-mono",
		spacing: "px-2 py-0.5",
		interaction: "rounded-full",
		color: "bg-base-300 text-base-content/70",
	}),
	grid: cstyle({ display: "flex flex-wrap", spacing: "gap-3" }),
	card: cstyle({
		display: "flex flex-col",
		sizing: "w-[calc(50%-6px)]",
		spacing: "gap-3 px-4 py-3",
		interaction: "rounded-lg border",
		color: "border-base-300 bg-base-200/50",
	}),
	cardRow: cstyle({ display: "flex items-center justify-between", spacing: "gap-3" }),
	cardInfo: cstyle({ display: "flex flex-col", sizing: "min-w-0" }),
	name: cstyle({ text: "text-sm font-medium truncate", color: "text-base-content" }),
	meta: cstyle({ text: "text-xs truncate", color: "text-base-content/40" }),
	toggle: cstyle({ display: "toggle toggle-sm" }),
	empty: cstyle({ text: "text-sm", color: "text-base-content/40" }),
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
