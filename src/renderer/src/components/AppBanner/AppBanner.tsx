import type { Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

// ── Layout ──

const banner = "flex flex-1 flex-col";
const logo = "flex items-center justify-between font-black text-xl leading-none tracking-wider font-[Orbitron]";
const version = "text-xs opacity-80";
const desc = "text-xs";

// ── Component ──

const AppBanner: Component = () => {
	const { t } = useLocale();

	return (
		<div class={banner}>
			<div class={`${logo} text-base-content dark:text-white`}>
				{t("banner.logo")}
				<span class={`${version} text-base-content/70 dark:text-white/90`}>0.1.0.0 Alpha</span>
			</div>
			<div class={`${desc} text-base-content/70 dark:text-white/70`}>{t("banner.desc")}</div>
		</div>
	);
};

export default AppBanner;
