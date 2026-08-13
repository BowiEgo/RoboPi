import { Moon, Sun } from "lucide-solid";
import { type Component, For } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { THEMES, useTheme } from "@/contexts/ThemeContext";

import { cstyle } from "@/utils/cstyle";

// ── Styles ──

const C = {
	sections: cstyle({
		display: "flex flex-col",
		spacing: "gap-8",
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
		display: "btn btn-soft btn-sm",
		spacing: "gap-2",
		variants: {
			active: { true: "btn-primary btn-active" },
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
	const { theme, setTheme, isDark, setDark } = useTheme();
	const { t } = useLocale();

	return (
		<div class={C.sections()}>
			<section class={C.section()}>
				<h2 class={C.eyebrow()}>{t("theme.mode")}</h2>
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
