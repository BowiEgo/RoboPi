import { type Component, For, createMemo } from "solid-js";
import { useTheme, THEMES } from "../../contexts/ThemeContext";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./ThemePage.module.css";

interface SwatchDef {
	name: string;
	var: string;
	value: string;
}

const TOGETHER_SWATCHES: SwatchDef[] = [
	{ name: "Primary", var: "--color-primary", value: "#000000" },
	{ name: "Canvas Dark", var: "--color-canvas-dark", value: "#010120" },
	{ name: "Surface Dark Soft", var: "--color-surface-dark-soft", value: "#313641" },
	{ name: "On Dark", var: "--color-on-dark", value: "#ffffff" },
	{ name: "Body", var: "--color-body", value: "#999999" },
	{ name: "Hairline", var: "--color-hairline", value: "#ebebeb" },
	{ name: "Canvas", var: "--color-canvas", value: "#ffffff" },
	{ name: "Accent Orange", var: "--color-accent-orange", value: "#fc4c02" },
	{ name: "Accent Magenta", var: "--color-accent-magenta", value: "#ef2cc1" },
	{ name: "Accent Periwinkle", var: "--color-accent-periwinkle", value: "#bdbbff" },
	{ name: "Accent Mint", var: "--color-accent-mint", value: "#c8f6f9" },
];

const OPENCODE_SWATCHES: SwatchDef[] = [
	{ name: "Primary / Ink", var: "--color-primary", value: "#201d1d" },
	{ name: "Canvas", var: "--color-canvas", value: "#fdfcfc" },
	{ name: "Surface Soft", var: "--color-surface-soft", value: "#f8f7f7" },
	{ name: "Surface Card", var: "--color-surface-card", value: "#f1eeee" },
	{ name: "Surface Dark", var: "--color-surface-dark-soft", value: "#302c2c" },
	{ name: "On Dark", var: "--color-on-dark", value: "#fdfcfc" },
	{ name: "Body", var: "--color-body", value: "#424245" },
	{ name: "Mute", var: "--color-mute", value: "#646262" },
	{ name: "Ash", var: "--color-ash", value: "#9a9898" },
	{ name: "Accent", var: "--color-accent", value: "#007aff" },
	{ name: "Success", var: "--color-success", value: "#30d158" },
	{ name: "Warning", var: "--color-warning", value: "#ff9f0a" },
	{ name: "Danger", var: "--color-danger", value: "#ff3b30" },
];

const TYPOGRAPHY = [
	{ name: "Display XL", class: styles.displayXxl, text: "Build what's next" },
	{ name: "Body MD", class: styles.bodyMd, text: "Default body paragraph text" },
	{ name: "Caption", class: styles.caption, text: "Fine print, secondary text" },
	{ name: "Mono / Button", class: styles.monoButton, text: "GET STARTED" },
] as const;

const SPACING = [
	{ name: "xs", value: "4px" },
	{ name: "sm", value: "8px" },
	{ name: "md", value: "12px" },
	{ name: "lg", value: "16px" },
	{ name: "xl", value: "24px" },
	{ name: "2xl", value: "32px" },
] as const;

const ThemePage: Component = () => {
	const { current, setTheme } = useTheme();
	const { t } = useLocale();

	const swatches = createMemo<SwatchDef[]>(() =>
		current().id === "opencode" ? OPENCODE_SWATCHES : TOGETHER_SWATCHES,
	);

	const gradientClass = createMemo(() =>
		current().id === "opencode" ? styles.gradientOpenCode : styles.gradientTogether,
	);

	return (
		<div class={styles.page}>
			<h1 class={styles.pageTitle}>{t("theme.title")}</h1>
			<p class={styles.pageDesc}>
				{t("theme.desc", { name: current().name, desc: current().desc })}
			</p>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.switch")}</h2>
				<div class={styles.themeGrid}>
					<For each={THEMES}>
						{(theme) => (
							<button
								class={`${styles.themeCard} ${current().id === theme.id ? styles.themeCardActive : ""}`}
								onClick={() => setTheme(theme.id)}
							>
								<span class={styles.themeName}>{theme.name}</span>
								<span class={styles.themeDesc}>{theme.desc}</span>
							</button>
						)}
					</For>
				</div>
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.colors")}</h2>
				<div class={styles.swatchGrid}>
					<For each={swatches()}>
						{(s) => (
							<div class={styles.swatchCard}>
								<div
									class={styles.swatch}
									style={{ background: `var(${s.var})` }}
								/>
								<div class={styles.swatchInfo}>
									<span class={styles.swatchName}>{s.name}</span>
									<span class={styles.swatchValue}>{s.value}</span>
									<code class={styles.swatchVar}>{s.var}</code>
								</div>
							</div>
						)}
					</For>
				</div>
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.gradient")}</h2>
				<div class={gradientClass()} />
				<p class={styles.bodyMd}>
					{current().id === "opencode"
						? t("theme.gradientOpenCode")
						: t("theme.gradientTogether")}
				</p>
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.typography")}</h2>
				<div class={styles.typeList}>
					<For each={TYPOGRAPHY}>
						{(t) => (
							<div class={styles.typeRow}>
								<span class={styles.typeLabel}>{t.name}</span>
								<span class={t.class}>{t.text}</span>
							</div>
						)}
					</For>
				</div>
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.spacing")}</h2>
				<div class={styles.spacingList}>
					<For each={SPACING}>
						{(s) => (
							<div class={styles.spacingRow}>
								<span class={styles.spacingName}>{s.name}</span>
								<span class={styles.spacingValue}>{s.value}</span>
								<div
									class={styles.spacingBar}
									style={{ width: `var(--space-${s.name})` }}
								/>
							</div>
						)}
					</For>
				</div>
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.radius")}</h2>
				<div class={styles.radiusRow}>
					<div
						class={styles.radiusBox}
						style={{ "border-radius": "var(--rounded-sm)" }}
					>
						sm
					</div>
				</div>
			</section>
		</div>
	);
};

export default ThemePage;
