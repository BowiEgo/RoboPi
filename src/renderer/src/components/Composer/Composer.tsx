import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
} from "solid-js";
import { useLocale } from "../../contexts/LocaleContext";
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
				<div
					class={styles.input}
					contentEditable
					role="textbox"
					data-placeholder={t("composer.placeholder")}
				/>
			</div>

			{/* Footer */}
			<div class={styles.footer}>
				<span class={styles.footerMeta} />
				<button class={styles.sendBtn} type="button">
					<svg class={styles.sendIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 2L11 18l-3-6-6-3 16-7z" />
					</svg>
					{t("composer.send")}
				</button>
			</div>
		</div>
	);
};

export default Composer;
