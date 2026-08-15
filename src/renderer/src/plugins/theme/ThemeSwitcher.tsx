/**
 * Built-in view: theme mode + theme switch.
 *
 * Declared by the builtin:theme plugin via ui { settings:section, theme-switcher }.
 * A renderer-local feature — theme state lives in ThemeContext, no Agent Host
 * round-trip — exposed as a plugin view so it can be disabled/replaced like
 * any other settings section.
 */

import { Moon, Sun } from "lucide-solid";
import { type Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { isDarkTheme, THEMES, useTheme } from "@/contexts/ThemeContext";

import Dropdown, { type DropdownOption } from "@/components/Dropdown/Dropdown";

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
	const { theme, setTheme, isDark, setDark } = useTheme();

	const themeOptions = (): DropdownOption[] => {
		// Sort light themes first so consecutive items group cleanly.
		const sorted = [...THEMES].sort((a, b) => {
			const da = isDarkTheme(a) ? 1 : 0;
			const db = isDarkTheme(b) ? 1 : 0;
			return da - db;
		});
		return sorted.map((id) => ({
			id,
			name: id,
			group: isDarkTheme(id) ? t("theme.modeDark") : t("theme.modeLight"),
			groupSearch: isDarkTheme(id) ? "dark" : "light",
			icon: <ThemeSwatch themeId={id} />,
		}));
	};

	// Temporarily switch the visible theme while browsing (no persistence).
	function previewTheme(id: string) {
		document.documentElement.setAttribute("data-theme", id);
	}

	// Restore the committed theme when the menu closes without selecting.
	function restoreTheme() {
		document.documentElement.setAttribute("data-theme", theme());
	}

	return (
		<>
			<section class={C.section()}>
				<h2 class={C.sectionTitle()}>{t("theme.mode")}</h2>
				<div class={C.modeRow()}>
					<button type="button" class={C.modeBtn({ active: isDark() })} onClick={() => setDark(true)}>
						<Moon class="w-4 h-4" />
						<span>{t("theme.modeDark")}</span>
					</button>
					<button type="button" class={C.modeBtn({ active: !isDark() })} onClick={() => setDark(false)}>
						<Sun class="w-4 h-4" />
						<span>{t("theme.modeLight")}</span>
					</button>
				</div>
			</section>

			<section class={`${C.section()} max-w-[12rem]`}>
				<h2 class={C.sectionTitle()}>{t("theme.switch")}</h2>
				<Dropdown
					value={theme()}
					options={themeOptions()}
					direction="up"
					placeholder={t("theme.switch")}
					onPreview={previewTheme}
					onClose={restoreTheme}
					onChange={setTheme}
				/>
			</section>
		</>
	);
};

export default ThemeSwitcher;
