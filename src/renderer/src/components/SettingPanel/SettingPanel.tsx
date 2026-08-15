import { type Component, createSignal, For, onMount } from "solid-js";

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
	sections: cstyle({ display: "flex flex-col", spacing: "gap-8 pb-6" }),
	section: cstyle({ display: "flex flex-col", spacing: "gap-4" }),
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

	const sectionExtensions = () => uiExtensions().filter((e) => e.slots.includes("settings:section"));

	function addModel(model: SavedModel) {
		setSavedModels((prev) => [...prev, model]);
	}

	function deleteModel(id: string) {
		setSavedModels((prev) => prev.filter((m) => m.id !== id));
	}

	onMount(async () => {
		const s = await getSettings();
		setInfo(s);
		// Seed the list with providers that already have a stored API key.
		setSavedModels(
			(s.configuredProviders ?? []).map((p) => ({
				id: p.id,
				name: p.name,
				provider: p.name,
			})),
		);
	});

	return (
		<div class={C.sections()}>
			{/* ── Storage ── */}
			<section class={C.section()}>
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

			{/* ── Providers ── */}
			<section class={C.section()}>
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

			{/* ── Language ── */}
			<section class={C.section()}>
				<h2 class={C.sectionTitle()}>{t("settings.locale")}</h2>
				<div class={C.localeRow()}>
					{LOCALES.map((l) => (
						<button type="button" class={C.localeBtn({ active: locale() === l.id })} onClick={() => setLocale(l.id)}>
							{t(l.labelKey)}
						</button>
					))}
				</div>
			</section>

			{/* ── Plugin-provided settings sections ── */}
			<For each={sectionExtensions()}>
				{(ext) => {
					const View = resolveView(ext.view);
					return View ? <View /> : null;
				}}
			</For>

			<Versions />
		</div>
	);
};

export default SettingPanel;
