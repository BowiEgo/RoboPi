import type { Component } from "solid-js";
import { useLocale, type LocaleId } from "../../contexts/LocaleContext";
import styles from "./SettingsPage.module.css";
import Versions from "../../components/Versions/Versions";

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
							class={`${styles.localeBtn} ${locale() === l.id ? styles.localeBtnActive : ""}`}
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
