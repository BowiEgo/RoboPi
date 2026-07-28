import { type Component, For, type JSX } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";
import TitleBar from "@/components/TitleBar/TitleBar";

import styles from "./MainLayout.module.css";

export interface NavItem {
	id: string;
	icon: JSX.Element;
	label: string;
	isSwitch?: boolean;
}

interface MainLayoutProps {
	topNavItems: NavItem[];
	bottomNavItems: NavItem[];
	activeNav: string;
	onNavSelect: (item: NavItem) => void;
	navTop?: JSX.Element;
	children: JSX.Element;
}

const MainLayout: Component<MainLayoutProps> = (props) => {
	const { t } = useLocale();

	return (
		<div class={styles.layout}>
			<TitleBar />
			<div class={styles.body}>
				<nav class={styles.navBar} aria-label={t("nav.pageNav")}>
					{props.navTop && <div class={styles.navTop}>{props.navTop}</div>}

					<div class={styles.navSection} role="tablist">
						<For each={props.topNavItems}>
							{(item) => (
								<button
									type="button"
									class={`${styles.navBtn} glass-btn ${props.activeNav === item.id ? `${styles.navBtnActive} glass-btn-active` : ""}`}
									role="tab"
									aria-selected={props.activeNav === item.id}
									aria-label={item.label}
									data-tooltip={item.label}
									onClick={() => props.onNavSelect(item)}
								>
									<span class={styles.navIcon}>{item.icon}</span>
								</button>
							)}
						</For>
					</div>

					{props.bottomNavItems.length > 0 && (
						<div class={styles.navSectionBottom}>
							<div class={styles.navDivider} />
							<For each={props.bottomNavItems}>
								{(item) => (
									<button
										type="button"
										class={`${styles.navBtn} glass-btn ${props.activeNav === item.id ? `${styles.navBtnActive} glass-btn-active` : ""}`}
										role="tab"
										aria-selected={props.activeNav === item.id}
										aria-label={item.label}
										data-tooltip={item.label}
										onClick={() => props.onNavSelect(item)}
									>
										<span class={styles.navIcon}>{item.icon}</span>
									</button>
								)}
							</For>
						</div>
					)}
				</nav>

				<main class={styles.pageArea} aria-label={t("nav.pageContent")}>
					{props.children}
				</main>
			</div>
		</div>
	);
};

export default MainLayout;
