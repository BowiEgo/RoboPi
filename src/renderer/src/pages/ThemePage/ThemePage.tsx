import { Moon, Sun } from "lucide-solid";
import { type Component, For } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { THEMES, useTheme } from "@/contexts/ThemeContext";

import { cstyle } from "@/utils/cstyle";

// ── Styles ──

const C = {
	page: cstyle({
		display: "flex flex-col",
		spacing: "p-12 gap-8",
		sizing: "max-w-180",
	}),
	pageTitle: cstyle({
		text: "text-[28px] font-semibold font-display",
		spacing: "m-0",
		color: "text-base-content",
	}),
	section: cstyle({
		display: "flex flex-col",
		spacing: "gap-4",
	}),
	eyebrow: cstyle({
		text: "font-mono text-[11px] font-medium uppercase tracking-wider",
		spacing: "m-0",
		color: "text-base-content/50",
	}),
	modeRow: cstyle({
		display: "flex",
		spacing: "gap-2",
	}),
	modeBtn: cstyle({
		display: "btn btn-outline btn-sm",
		spacing: "gap-2",
		variants: {
			active: { true: "btn-active" },
		},
	}),
	themeGrid: cstyle({
		display: "flex flex-wrap",
		spacing: "gap-2",
	}),
	themeBtn: cstyle({
		display: "btn btn-sm capitalize",
		variants: {
			active: { true: "btn-primary", false: "btn-ghost" },
		},
	}),
};

// ── Component ──

const ThemePage: Component = () => {
	const { theme, setTheme, isDark, toggleDark } = useTheme();
	const { t } = useLocale();

	return (
		<div class={C.page()}>
			<h1 class={C.pageTitle()}>{t("theme.title")}</h1>

			<section class={C.section()}>
				<h2 class={C.eyebrow()}>{t("theme.mode")}</h2>
				<div class={C.modeRow()}>
					<button type="button" class={C.modeBtn({ active: isDark() })} onClick={() => toggleDark()}>
						<Moon class="w-4 h-4" />
						<span>{t("theme.modeDark")}</span>
					</button>
					<button type="button" class={C.modeBtn({ active: !isDark() })} onClick={() => toggleDark()}>
						<Sun class="w-4 h-4" />
						<span>{t("theme.modeLight")}</span>
					</button>
				</div>
			</section>

			<section class={C.section()}>
				<h2 class={C.eyebrow()}>{t("theme.switch")}</h2>
				<div class={C.themeGrid()}>
					<For each={[...THEMES]}>
						{(id) => (
							<button
								type="button"
								class={C.themeBtn({ active: theme() === id })}
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
