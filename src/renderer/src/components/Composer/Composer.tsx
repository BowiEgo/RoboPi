import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
} from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Icon from "@/components/Icon";

import msgIcon from "@/assets/message.svg?raw";

import styles from "./Composer.module.css";

const Composer: Component = () => {
	const { t } = useLocale();
	const [height, setHeight] = createSignal(160);
	const [isResizing, setIsResizing] = createSignal(false);
	const [isFocused, setIsFocused] = createSignal(false);
	let startY = 0;
	let startH = 0;

	const clamp = (h: number) => Math.max(80, Math.min(400, h));

	const handleMouseDown = (e: MouseEvent) => {
		e.preventDefault();
		startY = e.clientY;
		startH = height();
		setIsResizing(true);
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isResizing()) return;
		setHeight(clamp(startH - (e.clientY - startY)));
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

	return (
		<div
			class={`${styles.composer} ${isFocused() ? styles.focused : ""} rounded-md`}
			style={{ height: `${height()}px` }}
			onFocusIn={() => setIsFocused(true)}
			onFocusOut={() => setIsFocused(false)}
		>
			{/* Resize Handle */}
			<div
				class={`${styles.resizeHandle} ${isResizing() ? styles.resizeHandleActive : ""}`}
				role="slider"
				tabIndex={0}
				aria-orientation="horizontal"
				aria-valuenow={height()}
				aria-valuemin={80}
				aria-valuemax={400}
				onMouseDown={handleMouseDown}
			>
				<div class={styles.resizeBump} />
			</div>

			{/* Toolbar */}
			<div class={styles.toolbar}>
				<button class={styles.toolBtn} type="button">
					{t("composer.mode")}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{t("composer.model")}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{t("composer.prompt")}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{t("composer.think")}
				</button>
			</div>

			{/* Input Area */}
			<div class={styles.inputArea}>
				<textarea
					class={styles.input}
					placeholder={t("composer.placeholder")}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
				/>
			</div>

			{/* Footer */}
			<div class={styles.footer}>
				<span class={styles.footerMeta} />
				<button class={styles.sendBtn} type="button">
					<span class={styles.sendIcon}>
						<Icon raw={msgIcon} />
					</span>
					{t("composer.send")}
				</button>
			</div>
		</div>
	);
};

export default Composer;
