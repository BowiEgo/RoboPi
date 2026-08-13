import { type Component, createSignal, onMount } from "solid-js";

import { type LocaleId, useLocale } from "@/contexts/LocaleContext";

import Versions from "@/components/Versions/Versions";
import ModelManager, { type SavedModel } from "@/components/ModelManager/ModelManager";

import { getSettings, type SettingsInfo } from "@/agent/ipc/settings";

const LOCALES: { id: LocaleId; labelKey: string }[] = [
	{ id: "en", labelKey: "settings.localeEn" },
	{ id: "zh-CN", labelKey: "settings.localeZh" },
];

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
		<div class="p-12 max-w-200">
			<h1 class="text-[28px] font-semibold text-base-content m-0 mb-2 font-display">
				{t("settings.title")}
			</h1>

			{/* ── Storage ── */}
			<section class="mb-12">
				<h2 class="font-mono text-[11px] font-medium uppercase tracking-wider text-base-content/50 mb-4">
					Storage
				</h2>
				<div class="flex flex-col gap-3 text-sm">
					<div class="flex items-center gap-2">
						<span class="text-base-content/50 w-32 shrink-0">Config dir</span>
						<code class="text-xs bg-base-200 px-2 py-1 rounded font-mono text-base-content/70 truncate">
							{info()?.configDir ?? "—"}
						</code>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-base-content/50 w-32 shrink-0">Sessions dir</span>
						<code class="text-xs bg-base-200 px-2 py-1 rounded font-mono text-base-content/70 truncate">
							{info()?.sessionsDir ?? "—"}
						</code>
					</div>
					<p class="text-xs text-base-content/30 mt-1">
						Set <code class="text-xs bg-base-200 px-1 rounded">ROBOPI_HOME</code> environment variable to
						override. Restart required.
					</p>
				</div>
			</section>

		{/* ── Providers ── */}
		<section class="mb-12">
			<h2 class="font-mono text-[11px] font-medium uppercase tracking-wider text-base-content/50 mb-4">
				Providers
			</h2>
			<ModelManager
				models={savedModels()}
				availableModels={info()?.availableModels ?? []}
				providerList={info()?.providerList ?? []}
				onAdd={addModel}
				onDelete={deleteModel}
			/>
		</section>

{/* ── Language ── */}
			<section class="mb-12">
				<h2 class="font-mono text-[11px] font-medium uppercase tracking-wider text-base-content/50 mb-4">
					{t("settings.locale")}
				</h2>
				<div class="flex gap-2">
					{LOCALES.map((l) => (
						<button
							type="button"
							class={`btn btn-outline btn-sm ${locale() === l.id ? "btn-active" : ""}`}
							onClick={() => setLocale(l.id)}
						>
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
