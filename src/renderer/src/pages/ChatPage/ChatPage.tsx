import { type Component, createSignal, type JSX } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Resizer from "@/components/Resizer/Resizer";
import Search from "@/components/Search/Search";

import styles from "./ChatPage.module.css";

import ChatPanel, { type ChatTag } from "./ChatPanel/ChatPanel";

interface ChatPageProps {
	/** 侧边栏头部内容 */
	sidebarHeader?: JSX.Element;
	/** 侧边栏主体内容 */
	sidebarContent: JSX.Element;
	/** 侧边栏底部内容 */
	sidebarBottom?: JSX.Element;
	/** 对话区标题 */
	chatHeader?: JSX.Element;
	/** 对话区过滤标签 */
	chatTags?: ChatTag[];
	/** 对话区消息内容 */
	children?: JSX.Element;
	/** 侧边栏初始宽度（默认 260px） */
	defaultWidth?: number;
	/** 侧边栏最小宽度（默认 180px） */
	minWidth?: number;
	/** 侧边栏最大宽度（默认 600px） */
	maxWidth?: number;
}

const ChatPage: Component<ChatPageProps> = (props) => {
	const { t } = useLocale();
	const minW = () => props.minWidth ?? 180;
	const maxW = () => props.maxWidth ?? 600;

	const [drawerWidth, setDrawerWidth] = createSignal(props.defaultWidth ?? 260);

	return (
		<div class={styles.layout}>
			{/* Left side drawer */}
			<aside
				class={styles.drawer}
				style={{ width: `${drawerWidth()}px` }}
				aria-label={t("chat.drawerLabel")}
			>
				{props.sidebarHeader && (
					<div class={styles.drawerHeader}>{props.sidebarHeader}</div>
				)}

				<div class={styles.drawerContent}>
					<Search />
					{props.sidebarContent}
				</div>
				{props.sidebarBottom && (
					<div class={styles.drawerBottom}>{props.sidebarBottom}</div>
				)}

				<Resizer
					value={drawerWidth()}
					min={minW()}
					max={maxW()}
					orientation="horizontal"
					position="right"
					handle={false}
					onChange={(v) => setDrawerWidth(v)}
				/>
			</aside>

			{/* Right side main area */}
			<main class={styles.main} aria-label={t("chat.contentLabel")}>
				<ChatPanel header={props.chatHeader} tags={props.chatTags}>
					{props.children}
				</ChatPanel>
			</main>
		</div>
	);
};

export default ChatPage;
