import type { Component, JSX } from "solid-js";

import styles from "./ChatPanel.module.css";

import Composer from "../Composer/Composer";

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
