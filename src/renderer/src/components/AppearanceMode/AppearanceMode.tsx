/**
 * Appearance mode — light / dark / system.
 *
 * A built-in settings section (not a plugin): the brightness mode is core
 * behavior and should not be disableable. Theme PICKING stays a plugin
 * (builtin:theme), but light/dark/system always lives here.
 */

import { Monitor, Moon, Sun } from "lucide-solid";
import { type Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";

import { cstyle } from "@/utils/cstyle";

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

const AppearanceMode: Component = () => {
	const { t } = useLocale();
	const { mode, setMode } = useTheme();

	return (
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
	);
};

export default AppearanceMode;
