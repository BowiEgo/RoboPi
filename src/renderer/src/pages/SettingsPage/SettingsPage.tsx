import type { Component } from "solid-js";

import { type LocaleId, useLocale } from "@/contexts/LocaleContext";

import Versions from "@/components/Versions/Versions";

import styles from "./SettingsPage.module.css";

const LOCALES: { id: LocaleId; labelKey: string }[] = [
	{ id: "en", labelKey: "settings.localeEn" },
	{ id: "zh-CN", labelKey: "settings.localeZh" },
];

const SettingsPage: Component = () => {
	const { t, locale, setLocale } = useLocale();

	return (
		<div class={styles.page}>
			<h1 class={styles.title}>{t("settings.title")}</h1>
			<p class={styles.desc}>{t("settings.pending")}</p>

			<section class={styles.section}>
				<h2 class={styles.sectionLabel}>{t("settings.locale")}</h2>
				<div class={styles.localeRow}>
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
