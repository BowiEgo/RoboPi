/**
 * Built-in view: appearance mode + theme cards.
 *
 * Declared by the builtin:theme plugin via ui { settings:general, theme-switcher }.
 * A renderer-local feature — theme state lives in ThemeContext, no Agent Host
 * round-trip — exposed as a plugin view so it can be disabled/replaced like
 * any other settings section.
 */

import { Monitor, Moon, Sun } from "lucide-solid";
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
	modeRow: cstyle({ display: "flex", spacing: "gap-2" }),
	modeBtn: cstyle({
		display: "btn btn-soft btn-sm",
		spacing: "gap-2",
		variants: {
			active: { true: "btn-primary btn-active" },
		},
	}),
	grid: cstyle({ display: "flex flex-wrap", spacing: "gap-2" }),
	card: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-3 py-2",
		sizing: "w-[calc(25%-6px)]",
		text: "text-sm",
		interaction: "rounded-lg border transition-colors",
		color: "border-base-300 bg-base-200/50 hover:border-base-content/30",
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
	const { theme, setTheme, mode, setMode } = useTheme();

	// Sort light themes first.
	const sortedThemes = () =>
		[...THEMES].sort((a, b) => {
			const da = isDarkTheme(a) ? 1 : 0;
			const db = isDarkTheme(b) ? 1 : 0;
			return da - db;
		});

	return (
		<>
			<section class={C.section()}>
				<h2 class={C.sectionTitle()}>{t("theme.mode")}</h2>
				<div class={C.modeRow()}>
					<button type="button" class={C.modeBtn({ active: mode() === "light" })} onClick={() => setMode("light")}>
						<Sun class="w-4 h-4" />
						<span>{t("theme.modeLight")}</span>
					</button>
					<button type="button" class={C.modeBtn({ active: mode() === "dark" })} onClick={() => setMode("dark")}>
						<Moon class="w-4 h-4" />
						<span>{t("theme.modeDark")}</span>
					</button>
					<button type="button" class={C.modeBtn({ active: mode() === "system" })} onClick={() => setMode("system")}>
						<Monitor class="w-4 h-4" />
						<span>{t("theme.modeSystem")}</span>
					</button>
				</div>
			</section>

			<section class={C.section()}>
				<h2 class={C.sectionTitle()}>{t("theme.switch")}</h2>
				<div class={C.grid()}>
					<For each={sortedThemes()}>
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
			</section>
		</>
	);
};

export default ThemeSwitcher;
