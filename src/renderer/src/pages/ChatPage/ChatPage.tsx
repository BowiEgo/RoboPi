import {
	type Component,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
} from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import styles from "./ChatPage.module.css";

import ChatPanel from "./ChatPanel";

interface ChatPageProps {
	/** 侧边栏头部内容 */
	sidebarHeader?: JSX.Element;
	/** 侧边栏主体内容 */
	sidebarContent: JSX.Element;
	/** 侧边栏底部内容 */
	sidebarBottom?: JSX.Element;
	/** 对话区标题 */
	chatHeader?: JSX.Element;
	/** 对话区消息内容 */
	children: JSX.Element;
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
	const [isResizing, setIsResizing] = createSignal(false);

	const clamp = (w: number) => Math.max(minW(), Math.min(maxW(), w));

	/* ---- 鼠标拖拽 ---- */
	const handleMouseDown = (e: MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isResizing()) return;
		setDrawerWidth(clamp(e.clientX));
	};

	const handleMouseUp = () => {
		setIsResizing(false);
	};

	createEffect(() => {
		if (isResizing()) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}
		onCleanup(() => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		});
	});

	/* ---- 键盘 ---- */
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			setDrawerWidth((prev) => clamp(prev - 20));
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			setDrawerWidth((prev) => clamp(prev + 20));
		}
	};

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
				<div class={styles.drawerContent}>{props.sidebarContent}</div>
				{props.sidebarBottom && (
					<div class={styles.drawerBottom}>{props.sidebarBottom}</div>
				)}

				{/* Draggable resizer */}
				<div
					class={`${styles.resizer} ${isResizing() ? styles.resizerActive : ""}`}
					role="slider"
					tabIndex={0}
					aria-valuenow={drawerWidth()}
					aria-valuemin={minW()}
					aria-valuemax={maxW()}
					aria-label={t("chat.drawerResize")}
					onMouseDown={handleMouseDown}
					onKeyDown={handleKeyDown}
				/>
			</aside>

			{/* Right side main area */}
			<main class={styles.main} aria-label={t("chat.contentLabel")}>
				<ChatPanel header={props.chatHeader}>{props.children}</ChatPanel>
			</main>
		</div>
	);
};

export default ChatPage;
