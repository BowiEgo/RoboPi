import type { Component } from "solid-js";

import { type LocaleId, useLocale } from "@/contexts/LocaleContext";

import Versions from "@/components/Versions/Versions";

const LOCALES: { id: LocaleId; labelKey: string }[] = [
	{ id: "en", labelKey: "settings.localeEn" },
	{ id: "zh-CN", labelKey: "settings.localeZh" },
];

const SettingsPage: Component = () => {
	const { t, locale, setLocale } = useLocale();

	return (
		<div class="p-12">
			<h1 class="text-[28px] font-semibold text-base-content m-0 mb-2 font-display">
				{t("settings.title")}
			</h1>
			<p class="text-base text-base-content/50 mb-12 font-display">
				{t("settings.pending")}
			</p>

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
