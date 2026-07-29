import type { Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import styles from "./AppBanner.module.css";

const AppBanner: Component = () => {
	const { t } = useLocale();

	return (
		<div class={styles.appBanner}>
			<div class={styles.bannerLogo}>
				{t("banner.logo")}
				<span class={styles.appVersion}>0.1.0.0 Alpha</span>
			</div>
			<div class={styles.bannerDesc}>{t("banner.desc")}</div>
		</div>
	);
};

export default AppBanner;
