import type { Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import styles from "./ThemePreview.module.css";

const ThemePreview: Component = () => {
	const { t } = useLocale();

	return (
		<div class={styles.preview}>
			{/* 导航栏 */}
			<nav class={styles.previewNav}>
				<div class={styles.previewNavIcon} />
				<div class={styles.previewNavIcon} />
				<div class={styles.previewNavSpacer} />
				<div class={styles.previewNavIcon} />
			</nav>

			{/* 侧边栏 */}
			<aside class={styles.previewSidebar}>
				<div class={styles.previewSidebarHeader}>
					{t("theme.previewSidebar")}
				</div>
				<div class={styles.previewSidebarItem} />
				<div class={styles.previewSidebarItem} />
				<div class={styles.previewSidebarItem} />
			</aside>

			{/* 主内容区 */}
			<main class={styles.previewMain}>
				<header class={styles.previewChatHeader}>
					{t("theme.previewChat")}
				</header>

				<div class={styles.previewMessages}>
					<div class={styles.previewMessageRow}>
						<div class={styles.previewAvatar} />
						<div class={styles.previewBubble}>{t("theme.previewMessage")}</div>
					</div>
					<div class={styles.previewMessageRow}>
						<div class={styles.previewBubbleUser}>
							{t("theme.previewReply")}
						</div>
						<div class={styles.previewAvatarUser} />
					</div>
				</div>

				<div class={styles.previewComposer}>
					<div class={styles.previewInput}>{t("theme.previewInput")}</div>
					<div class={styles.previewSendBtn}>{t("theme.previewSend")}</div>
				</div>
			</main>
		</div>
	);
};

export default ThemePreview;
