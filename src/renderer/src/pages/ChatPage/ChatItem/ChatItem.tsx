import { type Component, createSignal, For } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Icon from "@/components/Icon";

import chatIcon from "@/assets/icons/chat.svg?raw";
import plusIcon from "@/assets/icons/plus.svg?raw";

import styles from "./ChatItem.module.css";

import SessionItem, { type SessionItemProps } from "./SessionItem";

interface ChatItemProps {
	sessions: SessionItemProps[];
}

const ChatItem: Component<ChatItemProps> = (props) => {
	const { t } = useLocale();
	const [activeId, setActiveId] = createSignal<string | undefined>(
		props.sessions[0]?.id,
	);

	return (
		<section class={styles.chatItem}>
			<header class={styles.header}>
				<span class={styles.headerIcon}>
					<Icon raw={chatIcon} />
				</span>
				<span class={styles.headerLabel}>{t("chat.sessions")}</span>
				<div class={styles.headerActions}>
					<span class={styles.headerCount}>{props.sessions.length}</span>
					<button
						type="button"
						class={styles.addBtn}
						aria-label={t("chat.addSession")}
					>
						<Icon raw={plusIcon} />
					</button>
				</div>
			</header>

			<div class={styles.sessionList} role="tablist">
				<For each={props.sessions}>
					{(item) => (
						<SessionItem
							id={item.id}
							label={item.label}
							subtitle={item.subtitle}
							time={item.time}
							status={item.status}
							active={activeId() === item.id}
							onClick={() => setActiveId(item.id)}
						/>
					)}
				</For>
			</div>
		</section>
	);
};

export default ChatItem;
