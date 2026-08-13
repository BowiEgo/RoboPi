import type { Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import { cstyle } from "@/utils/cstyle";

// ── Styles ──

const C = {
	banner: cstyle({ display: "flex flex-1 flex-col" }),
	logo: cstyle({
		display: "flex items-center justify-between",
		text: "font-black text-xl leading-none tracking-wider font-[Orbitron]",
		color: "text-base-content",
	}),
	version: cstyle({
		text: "text-xs",
		interaction: "opacity-80",
		color: "text-base-content/50",
	}),
	desc: cstyle({
		text: "text-xs",
		color: "text-base-content/50",
	}),
};

// ── Component ──

const AppBanner: Component = () => {
	const { t } = useLocale();

	return (
		<div class={C.banner()}>
			<div class={C.logo()}>
				{t("banner.logo")}
				<span class={C.version()}>0.1.0.0 Alpha</span>
			</div>
			<div class={C.desc()}>{t("banner.desc")}</div>
		</div>
	);
};

export default AppBanner;
