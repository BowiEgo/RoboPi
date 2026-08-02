import { type Component, createSignal, For, Show } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import Icon from "@/components/Icon";

import chatIcon from "@/assets/icons/chat.svg?raw";
import plusIcon from "@/assets/icons/plus.svg?raw";

import styles from "./ChatItem.module.css";

import SessionItem, { type SessionItemProps } from "./SessionItem";

const ChatItem: Component = () => {
	const { t } = useLocale();
	const {
		sessions,
		activeId,
		createSession,
		switchSession,
		deleteSession,
		renameSession,
	} = useAgent();

	const [confirmDelete, setConfirmDelete] = createSignal<string | null>(null);

	function handleDelete(id: string) {
		if (confirmDelete() === id) {
			deleteSession(id);
			setConfirmDelete(null);
		} else {
			setConfirmDelete(id);
			setTimeout(() => {
				if (confirmDelete() === id) setConfirmDelete(null);
			}, 3000);
		}
	}

	return (
		<section class={styles.chatItem}>
			<header class={styles.header}>
				<span class={styles.headerIcon}>
					<Icon raw={chatIcon} />
				</span>
				<span class={styles.headerLabel}>{t("chat.sessions")}</span>
				<div class={styles.headerActions}>
					<span class={styles.headerCount}>{sessions().length}</span>
					<button
						type="button"
						class={styles.addBtn}
						aria-label={t("chat.addSession")}
						onClick={() => createSession()}
					>
						<Icon raw={plusIcon} />
					</button>
				</div>
			</header>

			<div class={styles.sessionList} role="tablist">
				<Show
					when={sessions().length > 0}
					fallback={<div class={styles.emptyHint}>{t("chat.noSessions")}</div>}
				>
					<For each={sessions()}>
						{(item: SessionItemProps) => (
							<SessionItem
								id={item.id}
								label={item.label}
								subtitle={item.subtitle}
								time={item.time}
								status={item.status}
								active={activeId() === item.id}
								confirmDelete={confirmDelete() === item.id}
								onClick={() => switchSession(item.id)}
								onDelete={() => handleDelete(item.id)}
								onDeleteImmediate={(id: string) => deleteSession(id)}
								onRename={(id, name) => renameSession(id, name)}
							/>
						)}
					</For>
				</Show>
			</div>
		</section>
	);
};

export default ChatItem;
