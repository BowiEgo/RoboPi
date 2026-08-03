import { Moon, Sun } from "lucide-solid";
import { type Component, For } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { THEMES, useTheme } from "@/contexts/ThemeContext";

import styles from "./ThemePage.module.css";

const ThemePage: Component = () => {
	const { theme, setTheme, isDark, toggleDark } = useTheme();
	const { t } = useLocale();

	return (
		<div class={styles.page}>
			<h1 class={styles.pageTitle}>{t("theme.title")}</h1>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>Mode</h2>
				<div class={styles.modeRow}>
					<button
						type="button"
						class={`btn btn-outline ${isDark() ? "btn-active" : ""}`}
						onClick={() => toggleDark()}
					>
						<span class={styles.modeBtnIcon}>
							<Moon />
						</span>
						<span>{t("theme.modeDark")}</span>
					</button>
					<button
						type="button"
						class={`btn btn-outline ${!isDark() ? "btn-active" : ""}`}
						onClick={() => toggleDark()}
					>
						<span class={styles.modeBtnIcon}>
							<Sun />
						</span>
						<span>{t("theme.modeLight")}</span>
					</button>
				</div>
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.switch")}</h2>
				<div class={styles.themeGrid}>
					<For each={[...THEMES]}>
						{(id) => (
							<button
								type="button"
								class={`btn btn-sm capitalize ${theme() === id ? "btn-primary" : "btn-ghost"}`}
								onClick={() => setTheme(id)}
								data-theme={id}
							>
								{id}
							</button>
						)}
					</For>
				</div>
			</section>
		</div>
	);
};

export default ThemePage;
