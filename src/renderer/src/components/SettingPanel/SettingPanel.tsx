import { type Component, createSignal, For, onMount, Show } from "solid-js";

import { type LocaleId, useLocale } from "@/contexts/LocaleContext";

import ModelManager, { type SavedModel } from "@/components/ModelManager/ModelManager";
import Versions from "@/components/Versions/Versions";

import { getSettings, type SettingsInfo } from "@/ipc/settings";
import { uiExtensions } from "@/ui-extensions";
import { resolveView } from "@/ui-views";
import { cstyle } from "@/utils/cstyle";

const LOCALES: { id: LocaleId; labelKey: string }[] = [
	{ id: "en", labelKey: "settings.localeEn" },
	{ id: "zh-CN", labelKey: "settings.localeZh" },
];

// ── Styles ──

const C = {
	layout: cstyle({ display: "flex", sizing: "gap-0 h-full" }),
	nav: cstyle({
		display: "flex flex-col",
		sizing: "w-44 shrink-0",
		spacing: "gap-1 py-1 pr-4",
		interaction: "border-r",
		color: "border-base-300",
	}),
	navItem: cstyle({
		display: "btn btn-ghost btn-sm justify-start",
		text: "font-normal",
		interaction: "rounded-lg",
		variants: {
			active: { true: "btn-active bg-base-200", false: "" },
		},
	}),
	content: cstyle({
		display: "flex flex-col",
		sizing: "flex-1 min-w-0",
		spacing: "gap-4 pl-6",
	}),
	sectionTitle: cstyle({
		text: "font-mono text-[14px] font-medium uppercase tracking-wider",
		color: "text-base-content/80",
	}),
	storageList: cstyle({
		display: "flex flex-col",
		spacing: "gap-3",
		text: "text-sm",
	}),
	storageRow: cstyle({
		display: "flex items-center",
		spacing: "gap-2",
	}),
	storageLabel: cstyle({
		sizing: "w-32 shrink-0",
		color: "text-base-content/50",
	}),
	storageValue: cstyle({
		text: "text-xs font-mono truncate",
		spacing: "px-2 py-1",
		interaction: "rounded",
		color: "bg-base-200 text-base-content/70",
	}),
	hint: cstyle({
		text: "text-xs",
		spacing: "mt-1",
		color: "text-base-content/30",
	}),
	localeRow: cstyle({
		display: "flex",
		spacing: "gap-2",
	}),
	localeBtn: cstyle({
		display: "btn btn-soft btn-sm",
		variants: {
			active: { true: "btn-active btn-primary" },
		},
	}),
};

// ── Component ──

const SettingPanel: Component = () => {
	const { t, locale, setLocale } = useLocale();
	const [info, setInfo] = createSignal<SettingsInfo | null>(null);
	const [savedModels, setSavedModels] = createSignal<SavedModel[]>([]);
	const [active, setActive] = createSignal("storage");

	function addModel(model: SavedModel) {
		setSavedModels((prev) => [...prev, model]);
	}

	function deleteModel(id: string) {
		setSavedModels((prev) => prev.filter((m) => m.id !== id));
	}

	onMount(async () => {
		const s = await getSettings();
		setInfo(s);
		setSavedModels(
			(s.configuredProviders ?? []).map((p) => ({
				id: p.id,
				name: p.name,
				provider: p.name,
			})),
		);
	});

	// Static sections + plugin-provided sections, for the left nav.
	const sections = () => [
		{ id: "storage", title: t("settings.storage") },
		{ id: "providers", title: t("settings.providers") },
		{ id: "language", title: t("settings.locale") },
		...uiExtensions()
			.filter((e) => e.slots.includes("settings:section"))
			.map((e) => ({ id: `${e.pluginId}:${e.view}`, title: e.title ?? e.view })),
	];

	return (
		<div class={C.layout()}>
			<nav class={C.nav()}>
				<For each={sections()}>
					{(s) => (
						<button type="button" class={C.navItem({ active: active() === s.id })} onClick={() => setActive(s.id)}>
							{s.title}
						</button>
					)}
				</For>
				<div class="mt-auto">
					<Versions />
				</div>
			</nav>

			<div class={C.content()}>
				<Show when={active() === "storage"}>
					<section class="flex flex-col gap-4">
						<h2 class={C.sectionTitle()}>{t("settings.storage")}</h2>
						<div class={C.storageList()}>
							<div class={C.storageRow()}>
								<span class={C.storageLabel()}>{t("settings.configDir")}</span>
								<code class={C.storageValue()}>{info()?.configDir ?? "—"}</code>
							</div>
							<div class={C.storageRow()}>
								<span class={C.storageLabel()}>{t("settings.sessionsDir")}</span>
								<code class={C.storageValue()}>{info()?.sessionsDir ?? "—"}</code>
							</div>
							<p class={C.hint()}>{t("settings.configDirHint", { env: "ROBOPI_HOME" })}</p>
						</div>
					</section>
				</Show>

				<Show when={active() === "providers"}>
					<section class="flex flex-col gap-4">
						<h2 class={C.sectionTitle()}>{t("settings.providers")}</h2>
						<ModelManager
							models={savedModels()}
							availableModels={info()?.availableModels ?? []}
							providerList={info()?.providerList ?? []}
							configDir={info()?.configDir}
							onAdd={addModel}
							onDelete={deleteModel}
						/>
					</section>
				</Show>

				<Show when={active() === "language"}>
					<section class="flex flex-col gap-4">
						<h2 class={C.sectionTitle()}>{t("settings.locale")}</h2>
						<div class={C.localeRow()}>
							{LOCALES.map((l) => (
								<button type="button" class={C.localeBtn({ active: locale() === l.id })} onClick={() => setLocale(l.id)}>
									{t(l.labelKey)}
								</button>
							))}
						</div>
					</section>
				</Show>

				<For each={uiExtensions().filter((e) => e.slots.includes("settings:section"))}>
					{(ext) => {
						const id = `${ext.pluginId}:${ext.view}`;
						const View = resolveView(ext.view);
						return View ? (
							<Show when={active() === id}>
								<View />
							</Show>
						) : null;
					}}
				</For>
			</div>
		</div>
	);
};

export default SettingPanel;
