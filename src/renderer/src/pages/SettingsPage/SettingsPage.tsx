import { type Component, createSignal, onMount } from "solid-js";

import { getSettings, type SettingsInfo } from "@/ipc/settings";
import { type LocaleId, useLocale } from "@/contexts/LocaleContext";

import ModelManager, { type SavedModel } from "@/components/ModelManager/ModelManager";
import Versions from "@/components/Versions/Versions";

import { cstyle } from "@/utils/cstyle";

const LOCALES: { id: LocaleId; labelKey: string }[] = [
	{ id: "en", labelKey: "settings.localeEn" },
	{ id: "zh-CN", labelKey: "settings.localeZh" },
];

// ── Styles ──

const C = {
	page: cstyle({
		spacing: "p-12",
		sizing: "max-w-200",
	}),
	title: cstyle({
		text: "text-[28px] font-semibold font-display",
		spacing: "m-0 mb-2",
		color: "text-base-content",
	}),
	section: cstyle({ spacing: "mb-12" }),
	sectionTitle: cstyle({
		text: "font-mono text-[11px] font-medium uppercase tracking-wider",
		spacing: "mb-4",
		color: "text-base-content/50",
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
	inlineCode: cstyle({
		text: "text-xs",
		spacing: "px-1",
		interaction: "rounded",
		color: "bg-base-200",
	}),
	localeRow: cstyle({
		display: "flex",
		spacing: "gap-2",
	}),
	localeBtn: cstyle({
		display: "btn btn-outline btn-sm",
		variants: {
			active: { true: "btn-active" },
		},
	}),
};

// ── Component ──

const SettingsPage: Component = () => {
	const { t, locale, setLocale } = useLocale();
	const [info, setInfo] = createSignal<SettingsInfo | null>(null);
	const [savedModels, setSavedModels] = createSignal<SavedModel[]>([]);

	function addModel(model: SavedModel) {
		setSavedModels((prev) => [...prev, model]);
	}

	function deleteModel(id: string) {
		setSavedModels((prev) => prev.filter((m) => m.id !== id));
	}

	onMount(async () => {
		const s = await getSettings();
		setInfo(s);
	});

	return (
		<div class={C.page()}>
			<h1 class={C.title()}>{t("settings.title")}</h1>

			{/* ── Storage ── */}
			<section class={C.section()}>
				<h2 class={C.sectionTitle()}>Storage</h2>
				<div class={C.storageList()}>
					<div class={C.storageRow()}>
						<span class={C.storageLabel()}>Config dir</span>
						<code class={C.storageValue()}>{info()?.configDir ?? "—"}</code>
					</div>
					<div class={C.storageRow()}>
						<span class={C.storageLabel()}>Sessions dir</span>
						<code class={C.storageValue()}>{info()?.sessionsDir ?? "—"}</code>
					</div>
					<p class={C.hint()}>
						Set <code class={C.inlineCode()}>ROBOPI_HOME</code> environment variable to override. Restart required.
					</p>
				</div>
			</section>

			{/* ── Providers ── */}
			<section class={C.section()}>
				<h2 class={C.sectionTitle()}>Providers</h2>
				<ModelManager
					models={savedModels()}
					availableModels={info()?.availableModels ?? []}
					providerList={info()?.providerList ?? []}
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

			<Versions />
		</div>
	);
};

export default SettingsPage;
