import { type Component, type JSX, For } from "solid-js";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./MainLayout.module.css";

export interface NavItem {
	id: string;
	icon: JSX.Element;
	label: string;
}

interface MainLayoutProps {
	topNavItems: NavItem[];
	bottomNavItems: NavItem[];
	activeNav: string;
	onNavSelect: (id: string) => void;
	navTop?: JSX.Element;
	children: JSX.Element;
}

const MainLayout: Component<MainLayoutProps> = (props) => {
	const { t } = useLocale();

	return (
		<div class={styles.layout}>
			<nav class={styles.navBar} role="tablist" aria-label={t("nav.pageNav")}>
				{props.navTop && <div class={styles.navTop}>{props.navTop}</div>}

				<div class={styles.navSection}>
					<For each={props.topNavItems}>
						{(item) => (
							<button
								class={`${styles.navBtn} ${props.activeNav === item.id ? styles.navBtnActive : ""}`}
								role="tab"
								aria-selected={props.activeNav === item.id}
								aria-label={item.label}
								data-tooltip={item.label}
								onClick={() => props.onNavSelect(item.id)}
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
									class={`${styles.navBtn} ${props.activeNav === item.id ? styles.navBtnActive : ""}`}
									role="tab"
									aria-selected={props.activeNav === item.id}
									aria-label={item.label}
									data-tooltip={item.label}
									onClick={() => props.onNavSelect(item.id)}
								>
									<span class={styles.navIcon}>{item.icon}</span>
								</button>
							)}
						</For>
					</div>
				)}
			</nav>

			<main class={styles.pageArea} role="region" aria-label={t("nav.pageContent")}>
				{props.children}
			</main>
		</div>
	);
};

export default MainLayout;
