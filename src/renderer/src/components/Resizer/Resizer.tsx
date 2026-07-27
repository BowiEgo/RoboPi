import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
} from "solid-js";

import styles from "./Resizer.module.css";

interface ResizerProps {
	/** 当前高度/宽度值 */
	value: number;
	/** 最小值 */
	min: number;
	/** 最大值 */
	max: number;
	/** 拖拽方向 */
	orientation?: "horizontal" | "vertical";
	/** 贴边位置 — horizontal 对应 top/bottom, vertical 对应 left/right */
	position?: "top" | "bottom" | "left" | "right";
	/** 是否显示拖拽手柄（bump），默认 true */
	handle?: boolean;
	/** 值变化回调 */
	onChange: (value: number) => void;
}

const Resizer: Component<ResizerProps> = (props) => {
	const [isResizing, setIsResizing] = createSignal(false);

	const orientation = () => props.orientation ?? "horizontal";
	const orientationClass = () =>
		orientation() === "vertical" ? styles.horizontal : styles.vertical;

	const position = () =>
		props.position ?? (orientation() === "vertical" ? "top" : "left");
	const positionClass = () => {
		const map: Record<string, string> = {
			top: styles.positionTop,
			bottom: styles.positionBottom,
			left: styles.positionLeft,
			right: styles.positionRight,
		};
		return map[position()] ?? "";
	};

	let startPos = 0;
	let startVal = 0;

	const clamp = (v: number) => Math.max(props.min, Math.min(props.max, v));

	const handleMouseDown = (e: MouseEvent) => {
		e.preventDefault();
		startPos = orientation() === "horizontal" ? e.clientX : e.clientY;
		startVal = props.value;
		setIsResizing(true);
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isResizing()) return;
		const currentPos = orientation() === "horizontal" ? e.clientX : e.clientY;
		const delta = currentPos - startPos;
		const newVal = clamp(
			orientation() === "horizontal" ? startVal + delta : startVal - delta,
		);
		props.onChange(newVal);
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
			class={`${styles.handle} ${orientationClass()} ${positionClass()} ${isResizing() ? styles.active : ""}`}
			role="slider"
			tabIndex={0}
			aria-orientation={orientation()}
			aria-valuenow={props.value}
			aria-valuemin={props.min}
			aria-valuemax={props.max}
			onMouseDown={handleMouseDown}
		>
			{props.handle !== false && <div class={styles.bump} />}
		</div>
	);
};

export default Resizer;
