import { type Component, createMemo, createSignal, type JSX } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import Resizer from "@/components/Resizer/Resizer";
import Search from "@/components/Search/Search";

import styles from "./ChatPage.module.css";

import ChatPanel, { type ChatTag } from "./ChatPanel/ChatPanel";

interface ChatPageProps {
	sidebarHeader?: JSX.Element;
	sidebarContent: JSX.Element;
	sidebarBottom?: JSX.Element;
	children?: JSX.Element;
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
}

const ChatPage: Component<ChatPageProps> = (props) => {
	const { t } = useLocale();
	const {
		activeId,
		activeName,
		messages,
		resetKey,
		loading,
		createSession,
		handleSend,
	} = useAgent();

	const minW = () => props.minWidth ?? 180;
	const maxW = () => props.maxWidth ?? 600;
	const [drawerWidth, setDrawerWidth] = createSignal(props.defaultWidth ?? 260);

	const tags = createMemo<ChatTag[]>(() => [
		{ id: "context", label: "上下文：0.0% / 1.0M ↑ 0 ↓ 0" },
		{ id: "cache", label: "缓存：0" },
		{ id: "cost", label: "$0.000" },
		{
			id: "new",
			label: t("chat.newSession"),
			type: "action",
			onClick: () => createSession(),
		},
	]);

	return (
		<div class={styles.layout}>
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

			<main class={styles.main} aria-label={t("chat.contentLabel")}>
				<ChatPanel
					header={
						<span>
							{loading()
								? t("status.starting") + "..."
								: activeName() || "RoboPi"}
						</span>
					}
					tags={tags()}
					sessionId={activeId() ?? undefined}
					initialMessages={messages()}
					resetKey={resetKey()}
					onSend={handleSend}
				>
					{props.children}
				</ChatPanel>
			</main>
		</div>
	);
};

export default ChatPage;
