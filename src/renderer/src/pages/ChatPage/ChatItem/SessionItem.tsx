import { type Component } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import styles from "./SessionItem.module.css";

export type SessionStatus = "idle" | "active" | "starting";

const STATUS_LABEL_KEY: Record<SessionStatus, string> = {
	idle: "status.idle",
	active: "status.active",
	starting: "status.starting",
};

export interface SessionItemProps {
	id: string;
	label: string;
	subtitle?: string;
	time?: string;
	status?: SessionStatus;
	active?: boolean;
	onClick?: (id: string) => void;
}

const SessionItem: Component<SessionItemProps> = (props) => {
	const { t } = useLocale();

	const resolvedStatus = () => props.status ?? "idle";

	const statusLabel = () => t(STATUS_LABEL_KEY[resolvedStatus()]);

	const badgeClass = () => {
		const base = styles.statusBadge;
		const extra = resolvedStatus() !== "idle" ? " " + styles[resolvedStatus()] : "";
		return base + extra;
	};

	return (
		<button
			type="button"
			class={`${styles.sessionItem} ${props.active ? styles.active : ""}`}
			onClick={() => props.onClick?.(props.id)}
			role="tab"
			aria-selected={props.active}
		>
			<span
				class={badgeClass()}
				aria-label={statusLabel()}
			>
				{statusLabel()}
			</span>
			<div class={styles.content}>
				<span class={styles.label}>{props.label}</span>
				{props.subtitle && (
					<span class={styles.subtitle}>{props.subtitle}</span>
				)}
			</div>
			{props.time && <span class={styles.time}>{props.time}</span>}
		</button>
	);
};

export default SessionItem;
