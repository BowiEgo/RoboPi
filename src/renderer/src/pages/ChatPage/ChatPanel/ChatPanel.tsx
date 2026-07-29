import { type Component, For, type JSX } from "solid-js";

import Icon from "@/components/Icon";

import plusIcon from "@/assets/icons/plus.svg?raw";

import styles from "./ChatPanel.module.css";

import Composer from "../Composer/Composer";

export interface ChatTag {
	id: string;
	label: string;
	type?: "info" | "action";
	onClick?: (id: string) => void;
}

interface ChatPanelProps {
	header?: JSX.Element;
	tags?: ChatTag[];
	children: JSX.Element;
}

const ChatPanel: Component<ChatPanelProps> = (props) => {
	return (
		<div class={styles.layout}>
			<header class={styles.header}>
				{props.header}
				{props.tags && props.tags.length > 0 && (
					<div class={styles.tags}>
						<For each={props.tags}>
							{(tag) =>
								tag.type === "action" ? (
									<button
										type="button"
										class={styles.actionBtn}
										onClick={() => tag.onClick?.(tag.id)}
									>
										<span class={styles.actionIcon}>
											<Icon raw={plusIcon} />
										</span>
										{tag.label}
									</button>
								) : (
									<span class={styles.tag}>{tag.label}</span>
								)
							}
						</For>
					</div>
				)}
			</header>

			<main class={styles.dialog}>{props.children}</main>

			<Composer />
		</div>
	);
};

export default ChatPanel;
