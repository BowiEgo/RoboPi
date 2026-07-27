import { type Component, createMemo, For } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { THEMES, useTheme } from "@/contexts/ThemeContext";

import Icon from "@/components/Icon";

import moonSvg from "@/assets/icons/moon.svg?raw";
import sunSvg from "@/assets/icons/sun.svg?raw";

import styles from "./ThemePage.module.css";

import ThemePreview from "./ThemePreview";

interface SwatchDef {
	name: string;
	var: string;
	group: string;
}

const TOGETHER_SWATCHES: SwatchDef[] = [
	/* ── 基础颜色 ── */
	{ name: "Primary", var: "--color-primary", group: "base" },
	{ name: "On Primary", var: "--color-on-primary", group: "base" },
	{ name: "Ink", var: "--color-ink", group: "base" },
	{ name: "Body", var: "--color-body", group: "base" },
	{ name: "Hairline", var: "--color-hairline", group: "base" },
	{ name: "On", var: "--color-on", group: "base" },
	/* ── 表面颜色 ── */
	{ name: "Canvas", var: "--color-canvas", group: "surface" },
	{ name: "Canvas Dark", var: "--color-canvas-dark", group: "surface" },
	{ name: "Surface Soft", var: "--color-surface-soft", group: "surface" },
	{ name: "Surface Card", var: "--color-surface-card", group: "surface" },
	{
		name: "Surface Dark Soft",
		var: "--color-surface-dark-soft",
		group: "surface",
	},
	{ name: "On Dark", var: "--color-on-dark", group: "surface" },
	/* ── 语义色 ── */
	{ name: "Accent Orange", var: "--color-accent-orange", group: "semantic" },
	{ name: "Accent Magenta", var: "--color-accent-magenta", group: "semantic" },
	{
		name: "Accent Periwinkle",
		var: "--color-accent-periwinkle",
		group: "semantic",
	},
	{ name: "Accent Mint", var: "--color-accent-mint", group: "semantic" },
	/* ── 布局映射 ── */
	{ name: "Sidebar BG", var: "--sidebar-bg", group: "layout" },
	{ name: "Sidebar Border", var: "--sidebar-border", group: "layout" },
	{
		name: "Sidebar Header Border",
		var: "--sidebar-header-border",
		group: "layout",
	},
	{ name: "Sidebar Text", var: "--sidebar-text", group: "layout" },
	{ name: "Sidebar Hover BG", var: "--sidebar-hover-bg", group: "layout" },
	{ name: "Sidebar Active BG", var: "--sidebar-active-bg", group: "layout" },
	{ name: "Main BG", var: "--main-bg", group: "layout" },
	{ name: "Main Text", var: "--main-text", group: "layout" },
	{ name: "Resizer Hover", var: "--resizer-hover-color", group: "layout" },
];

const OPENCODE_SWATCHES: SwatchDef[] = [
	/* ── 基础颜色 ── */
	{ name: "Primary", var: "--color-primary", group: "base" },
	{ name: "On Primary", var: "--color-on-primary", group: "base" },
	{ name: "Ink", var: "--color-ink", group: "base" },
	{ name: "Ink Deep", var: "--color-ink-deep", group: "base" },
	{ name: "Body", var: "--color-body", group: "base" },
	{ name: "Mute", var: "--color-mute", group: "base" },
	{ name: "Stone", var: "--color-stone", group: "base" },
	{ name: "Ash", var: "--color-ash", group: "base" },
	{ name: "Hairline", var: "--color-hairline", group: "base" },
	{ name: "Hairline Strong", var: "--color-hairline-strong", group: "base" },
	{ name: "On", var: "--color-on", group: "base" },
	/* ── 表面颜色 ── */
	{ name: "Canvas", var: "--color-canvas", group: "surface" },
	{ name: "Canvas Dark", var: "--color-canvas-dark", group: "surface" },
	{ name: "Surface Soft", var: "--color-surface-soft", group: "surface" },
	{ name: "Surface Card", var: "--color-surface-card", group: "surface" },
	{ name: "Charcoal", var: "--color-charcoal", group: "surface" },
	{
		name: "Surface Dark Soft",
		var: "--color-surface-dark-soft",
		group: "surface",
	},
	{
		name: "Surface Dark Elevated",
		var: "--color-surface-dark-elevated",
		group: "surface",
	},
	{ name: "On Dark", var: "--color-on-dark", group: "surface" },
	{ name: "On Dark Mute", var: "--color-on-dark-mute", group: "surface" },
	/* ── 语义色 ── */
	{ name: "Accent", var: "--color-accent", group: "semantic" },
	{ name: "Accent Hover", var: "--color-accent-hover", group: "semantic" },
	{ name: "Accent Active", var: "--color-accent-active", group: "semantic" },
	{ name: "Warning", var: "--color-warning", group: "semantic" },
	{ name: "Danger", var: "--color-danger", group: "semantic" },
	{ name: "Success", var: "--color-success", group: "semantic" },
	{
		name: "Accent Periwinkle",
		var: "--color-accent-periwinkle",
		group: "semantic",
	},
	{ name: "Accent Mint", var: "--color-accent-mint", group: "semantic" },
	{ name: "Accent Orange", var: "--color-accent-orange", group: "semantic" },
	{ name: "Accent Magenta", var: "--color-accent-magenta", group: "semantic" },
	/* ── 布局映射 ── */
	{ name: "Sidebar BG", var: "--sidebar-bg", group: "layout" },
	{ name: "Sidebar Border", var: "--sidebar-border", group: "layout" },
	{
		name: "Sidebar Header Border",
		var: "--sidebar-header-border",
		group: "layout",
	},
	{ name: "Sidebar Text", var: "--sidebar-text", group: "layout" },
	{ name: "Sidebar Hover BG", var: "--sidebar-hover-bg", group: "layout" },
	{ name: "Sidebar Active BG", var: "--sidebar-active-bg", group: "layout" },
	{ name: "Main BG", var: "--main-bg", group: "layout" },
	{ name: "Main Text", var: "--main-text", group: "layout" },
	{ name: "Resizer Color", var: "--resizer-color", group: "layout" },
	{ name: "Resizer Hover", var: "--resizer-hover-color", group: "layout" },
];

const TYPOGRAPHY = [
	{ name: "Display XL", class: styles.displayXxl, text: "Build what's next" },
	{
		name: "Body MD",
		class: styles.bodyMd,
		text: "Default body paragraph text",
	},
	{
		name: "Caption",
		class: styles.caption,
		text: "Fine print, secondary text",
	},
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
	const { current, setTheme, mode, setMode } = useTheme();
	const { t } = useLocale();

	const swatches = createMemo<
		{ label: string; items: (SwatchDef & { value: string })[] }[]
	>(() => {
		const list =
			current().id === "opencode" ? OPENCODE_SWATCHES : TOGETHER_SWATCHES;
		const root = document.documentElement;
		const style = getComputedStyle(root);
		const withValues = list.map((s) => ({
			...s,
			value: style.getPropertyValue(s.var).trim() || "—",
		}));

		const groups: { label: string; key: string }[] = [
			{ label: "Base Colors", key: "base" },
			{ label: "Surface Colors", key: "surface" },
			{ label: "Semantic Colors", key: "semantic" },
			{ label: "Layout Mappings", key: "layout" },
		];

		return groups
			.map((g) => ({
				label: g.label,
				items: withValues.filter((s) => s.group === g.key),
			}))
			.filter((g) => g.items.length > 0);
	});

	const gradientClass = createMemo(() =>
		current().id === "opencode"
			? styles.gradientOpenCode
			: styles.gradientTogether,
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
								type="button"
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
				<h2 class={styles.sectionEyebrow}>{t("theme.mode")}</h2>
				<p class={styles.modeHint}>{t("theme.modeHint")}</p>
				<div class={styles.modeRow}>
					<button
						type="button"
						class={`${styles.modeBtn} ${mode() === "dark" ? styles.modeBtnActive : ""}`}
						onClick={() => setMode("dark")}
					>
						<span class={styles.modeBtnIcon}>
							<Icon raw={moonSvg} />
						</span>
						<span>{t("theme.modeDark")}</span>
					</button>
					<button
						type="button"
						class={`${styles.modeBtn} ${mode() === "light" ? styles.modeBtnActive : ""}`}
						onClick={() => setMode("light")}
					>
						<span class={styles.modeBtnIcon}>
							<Icon raw={sunSvg} />
						</span>
						<span>{t("theme.modeLight")}</span>
					</button>
				</div>
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.preview")}</h2>
				<ThemePreview />
			</section>

			<section class={styles.section}>
				<h2 class={styles.sectionEyebrow}>{t("theme.colors")}</h2>
				<For each={swatches()}>
					{(group) => (
						<div class={styles.swatchGroup}>
							<h3 class={styles.swatchGroupLabel}>{group.label}</h3>
							<div class={styles.swatchGrid}>
								<For each={group.items}>
									{(s) => (
										<div class={styles.swatchCard}>
											<div
												class={styles.swatch}
												style={{
													background: `var(${s.var})`,
												}}
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
						</div>
					)}
				</For>
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
						style={{ "border-radius": "var(--radius-sm)" }}
					>
						sm
					</div>
				</div>
			</section>
		</div>
	);
};

export default ThemePage;
