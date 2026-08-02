import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";

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
	confirmDelete?: boolean;
	onClick?: (id: string) => void;
	onDelete?: (id: string) => void;
	onDeleteImmediate?: (id: string) => void;
	onRename?: (id: string, name: string) => void;
}

const SessionItem: Component<SessionItemProps> = (props) => {
	const { t } = useLocale();

	const resolvedStatus = () => props.status ?? "idle";
	const statusLabel = () => t(STATUS_LABEL_KEY[resolvedStatus()]);

	const badgeClass = () => {
		const base = styles.statusBadge;
		const extra =
			resolvedStatus() !== "idle" ? " " + styles[resolvedStatus()] : "";
		return base + extra;
	};

	// ── 右键菜单 ──
	const [menuOpen, setMenuOpen] = createSignal(false);
	const [menuPos, setMenuPos] = createSignal({ x: 0, y: 0 });
	const [pendingDelete, setPendingDelete] = createSignal(false);
	let itemRef: HTMLDivElement | undefined;

	function onContextMenu(e: MouseEvent) {
		e.preventDefault();
		setPendingDelete(false);
		setMenuPos({ x: e.clientX, y: e.clientY });
		setMenuOpen(true);
	}

	function closeMenu() {
		setMenuOpen(false);
	}

	// 点击外部关闭菜单
	function onDocClick() {
		closeMenu();
	}

	createEffect(() => {
		if (menuOpen()) {
			document.addEventListener("click", onDocClick);
			document.addEventListener("contextmenu", onDocClick);
		} else {
			document.removeEventListener("click", onDocClick);
			document.removeEventListener("contextmenu", onDocClick);
		}
	});

	onCleanup(() => {
		document.removeEventListener("click", onDocClick);
		document.removeEventListener("contextmenu", onDocClick);
	});

	function handleRename() {
		closeMenu();
		// 延迟一下让菜单关闭动画完成
		setTimeout(() => setEditingName(props.label), 50);
	}

	function handleDelete() {
		closeMenu();
		// 活跃会话：需要二次确认（正在使用中）
		if (props.active) {
			setPendingDelete(true);
			// 3 秒后自动取消
			setTimeout(() => setPendingDelete(false), 3000);
			return;
		}
		// 非活跃会话：直接执行
		props.onDeleteImmediate?.(props.id);
	}

	function confirmDeleteActive() {
		setPendingDelete(false);
		props.onDeleteImmediate?.(props.id);
	}

	// ── 重命名 ──
	const [editingName, setEditingName] = createSignal<string | null>(null);
	let renameInput: HTMLInputElement | undefined;

	createEffect(() => {
		if (editingName() !== null && renameInput) {
			renameInput.focus();
			renameInput.select();
		}
	});

	function commitRename() {
		const name = editingName();
		if (name !== null && name.trim() && name.trim() !== props.label) {
			props.onRename?.(props.id, name.trim());
		}
		setEditingName(null);
	}

	return (
		<div
			ref={itemRef}
			class={`${styles.sessionItem} ${props.active ? styles.active : ""}`}
			onContextMenu={onContextMenu}
		>
			<button
				type="button"
				class={styles.clickArea}
				onClick={() => props.onClick?.(props.id)}
				role="tab"
				aria-selected={props.active}
			>
				<span class={badgeClass()}>{statusLabel()}</span>
				<div class={styles.content}>
					<Show
						when={editingName() !== null}
						fallback={<span class={styles.label}>{props.label}</span>}
					>
						<input
							ref={renameInput}
							type="text"
							class={styles.renameInput}
							value={editingName()!}
							onInput={(e) => setEditingName(e.currentTarget.value)}
							onBlur={commitRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") commitRename();
								if (e.key === "Escape") setEditingName(null);
							}}
							onClick={(e) => e.stopPropagation()}
						/>
					</Show>
					{props.subtitle && (
						<span class={styles.subtitle}>{props.subtitle}</span>
					)}
				</div>
				{props.time && <span class={styles.time}>{props.time}</span>}
			</button>

			<Show when={props.confirmDelete}>
				<button
					type="button"
					class={styles.deleteConfirm}
					onClick={(e) => {
						e.stopPropagation();
						props.onDelete?.(props.id);
					}}
				>
					{t("chat.deleteConfirm")}
				</button>
			</Show>

			{/* 活跃会话删除确认 */}
			<Show when={pendingDelete()}>
				<div class={styles.activeDeleteBanner}>
					<span class={styles.activeDeleteText}>
						{t("chat.deleteActiveHint")}
					</span>
					<div class={styles.activeDeleteActions}>
						<button
							type="button"
							class={styles.cancelBtn}
							onClick={(e) => {
								e.stopPropagation();
								setPendingDelete(false);
							}}
						>
							{t("chat.cancel")}
						</button>
						<button
							type="button"
							class={styles.confirmDeleteBtn}
							onClick={(e) => {
								e.stopPropagation();
								confirmDeleteActive();
							}}
						>
							{t("chat.delete")}
						</button>
					</div>
				</div>
			</Show>

			{/* ── 右键菜单 ── */}
			<Show when={menuOpen()}>
				<div class={styles.contextOverlay} onClick={closeMenu} />
				<div
					class={styles.contextMenu}
					style={{
						left: `${menuPos().x}px`,
						top: `${menuPos().y}px`,
					}}
				>
					<button
						type="button"
						class={styles.contextMenuItem}
						onClick={handleRename}
					>
						{t("chat.rename")}
					</button>
					<div class={styles.contextMenuSep} />
					<button
						type="button"
						class={`${styles.contextMenuItem} ${styles.danger}`}
						onClick={handleDelete}
					>
						{t("chat.delete")}
					</button>
				</div>
			</Show>
		</div>
	);
};

export default SessionItem;
