/**
 * Built-in view: theme cards (theme picking).
 *
 * Declared by the builtin:theme plugin via ui { settings:general, theme-switcher }.
 * The brightness mode (light/dark/system) is NOT here — it lives in the
 * built-in AppearanceMode section, so disabling this plugin only removes
 * theme picking, not the light/dark switch.
 */

import { type Component, For } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { isDarkTheme, THEMES, useTheme } from "@/contexts/ThemeContext";

import { cstyle } from "@/utils/cstyle";

// ── Styles ──

const C = {
	section: cstyle({ display: "flex flex-col", spacing: "gap-4" }),
	sectionTitle: cstyle({
		text: "font-mono text-[14px] font-medium uppercase tracking-wider",
		color: "text-base-content/80",
	}),
	currentRow: cstyle({ display: "flex items-center", spacing: "gap-3" }),
	currentLabel: cstyle({ text: "text-xs", color: "text-base-content/50" }),
	currentCard: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-3 py-2",
		text: "text-sm",
		interaction: "rounded-lg border",
		color: "border-primary bg-primary/10 text-primary",
	}),
	scroll: cstyle({
		display: "flex flex-col",
		spacing: "gap-2 p-2",
		sizing: "w-[75%] h-72 overflow-y-auto",
		interaction: "rounded-lg",
		color: "bg-base-200",
	}),
	groupLabel: cstyle({
		text: "font-mono text-[11px] font-medium uppercase tracking-wider",
		color: "text-base-content/50",
	}),
	grid: cstyle({ display: "flex flex-wrap", spacing: "gap-2" }),
	card: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-3 py-2",
		sizing: "w-[calc(33%-6px)]",
		text: "text-sm",
		interaction: "rounded-lg border transition-colors",
		color: "border-base-300 bg-base-100 hover:border-base-content/30",
		variants: {
			active: { true: "border-primary bg-primary/10 text-primary", false: "text-base-content" },
		},
	}),
};

// ── Theme color swatch ──

/** A small palette preview scoped to the target theme via data-theme. */
function ThemeSwatch(props: { themeId: string }) {
	return (
		<span
			class="grid grid-cols-2 gap-0.5 rounded p-1 bg-base-100 border border-base-content/10"
			data-theme={props.themeId}
		>
			<span class="w-1.5 h-1.5 rounded-full bg-base-content" />
			<span class="w-1.5 h-1.5 rounded-full bg-primary" />
			<span class="w-1.5 h-1.5 rounded-full bg-secondary" />
			<span class="w-1.5 h-1.5 rounded-full bg-accent" />
		</span>
	);
}

// ── Component ──

const ThemeSwitcher: Component = () => {
	const { t } = useLocale();
	const { theme, setTheme } = useTheme();

	const lightThemes = () => [...THEMES].filter((id) => !isDarkTheme(id));
	const darkThemes = () => [...THEMES].filter((id) => isDarkTheme(id));

	return (
		<section class={C.section()}>
			<h2 class={C.sectionTitle()}>{t("theme.switch")}</h2>

			<div class={C.currentRow()}>
				<span class={C.currentLabel()}>{t("theme.current")}</span>
				<div class={C.currentCard()}>
					<ThemeSwatch themeId={theme()} />
					<span>{theme()}</span>
				</div>
			</div>

			<div class={C.scroll()}>
				<div class={C.groupLabel()}>{t("theme.modeLight")}</div>
				<div class={C.grid()}>
					<For each={lightThemes()}>
						{(id) => (
							<button
								type="button"
								class={C.card({ active: theme() === id })}
								onClick={() => setTheme(id)}
								data-theme={id}
							>
								<ThemeSwatch themeId={id} />
								<span class="truncate">{id}</span>
							</button>
						)}
					</For>
				</div>

				<div class={C.groupLabel()}>{t("theme.modeDark")}</div>
				<div class={C.grid()}>
					<For each={darkThemes()}>
						{(id) => (
							<button
								type="button"
								class={C.card({ active: theme() === id })}
								onClick={() => setTheme(id)}
								data-theme={id}
							>
								<ThemeSwatch themeId={id} />
								<span class="truncate">{id}</span>
							</button>
						)}
					</For>
				</div>
			</div>
		</section>
	);
};

export default ThemeSwitcher;
