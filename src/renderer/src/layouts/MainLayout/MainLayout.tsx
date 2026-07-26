import { type Component, type JSX, For } from "solid-js";
import styles from "./MainLayout.module.css";

export interface NavItem {
	id: string;
	icon: JSX.Element;
	label: string;
}

interface MainLayoutProps {
	/** 顶部导航图标列表 */
	topNavItems: NavItem[];
	/** 底部导航图标列表 */
	bottomNavItems: NavItem[];
	/** 当前激活的页面 ID */
	activeNav: string;
	/** 导航切换回调 */
	onNavSelect: (id: string) => void;
	/** 顶部 Logo / 品牌区（可选） */
	navTop?: JSX.Element;
	/** 页面内容 */
	children: JSX.Element;
}

const MainLayout: Component<MainLayoutProps> = (props) => {
	return (
		<div class={styles.layout}>
			{/* 左侧导航栏 */}
			<nav class={styles.navBar} role="tablist" aria-label="页面切换">
				{/* 顶部：Logo */}
				{props.navTop && <div class={styles.navTop}>{props.navTop}</div>}

				{/* 中部：主导航 */}
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

				{/* 底部：次要导航 */}
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

			{/* 右侧页面区 */}
			<main class={styles.pageArea} role="region" aria-label="页面内容">
				{props.children}
			</main>
		</div>
	);
};

export default MainLayout;
