import { Moon, Sun } from "lucide-solid";
import { type Component, For } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import { THEMES, useTheme } from "@/contexts/ThemeContext";

const ThemePage: Component = () => {
	const { theme, setTheme, isDark, toggleDark } = useTheme();
	const { t } = useLocale();

	return (
		<div class="flex flex-col p-12 gap-8 max-w-180">
			<h1 class="text-[28px] font-semibold text-base-content m-0 font-display">
				{t("theme.title")}
			</h1>

			<section class="flex flex-col gap-4">
				<h2 class="font-mono text-[11px] font-medium uppercase tracking-wider text-base-content/50 m-0">
					{t("theme.mode")}
				</h2>
				<div class="flex gap-2">
					<button
						type="button"
						class={`btn btn-outline btn-sm gap-2 ${isDark() ? "btn-active" : ""}`}
						onClick={() => toggleDark()}
					>
						<Moon class="w-4 h-4" />
						<span>{t("theme.modeDark")}</span>
					</button>
					<button
						type="button"
						class={`btn btn-outline btn-sm gap-2 ${!isDark() ? "btn-active" : ""}`}
						onClick={() => toggleDark()}
					>
						<Sun class="w-4 h-4" />
						<span>{t("theme.modeLight")}</span>
					</button>
				</div>
			</section>

			<section class="flex flex-col gap-4">
				<h2 class="font-mono text-[11px] font-medium uppercase tracking-wider text-base-content/50 m-0">
					{t("theme.switch")}
				</h2>
				<div class="flex flex-wrap gap-2">
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
