import type { Component, JSX } from "solid-js";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
	/** 顶部标题栏内容 */
	header?: JSX.Element;
	/** 中间对话框区域 */
	children: JSX.Element;
	/** 底部输入框区域 */
	input?: JSX.Element;
}

const ChatPanel: Component<ChatPanelProps> = (props) => {
	return (
		<div class={styles.layout}>
			{/* 顶部标题栏 */}
			<header class={styles.header}>{props.header}</header>

			{/* 中间对话框 — 撑满剩余空间，可滚动 */}
			<main class={styles.dialog}>{props.children}</main>

			{/* 底部输入框 — 高度由内容决定 */}
			<footer class={styles.input}>{props.input}</footer>
		</div>
	);
};

export default ChatPanel;
