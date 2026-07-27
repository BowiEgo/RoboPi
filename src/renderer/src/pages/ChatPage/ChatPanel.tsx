import type { Component, JSX } from "solid-js";

import Composer from "@/components/Composer/Composer";

import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
	header?: JSX.Element;
	children: JSX.Element;
}

const ChatPanel: Component<ChatPanelProps> = (props) => {
	return (
		<div class={styles.layout}>
			<header class={styles.header}>{props.header}</header>

			<main class={styles.dialog}>{props.children}</main>

			<Composer />
		</div>
	);
};

export default ChatPanel;
