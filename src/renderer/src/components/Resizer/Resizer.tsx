import { GripHorizontal, GripVertical } from "lucide-solid";
import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
} from "solid-js";

import styles from "./Resizer.module.css";

interface ResizerProps {
	value: number;
	min: number;
	max: number;
	/** Edge to attach to: top/bottom → horizontal bar, left/right → vertical bar */
	position: "top" | "bottom" | "left" | "right";
	/** Show grip icon on hover/active. Defaults to true. */
	grip?: boolean;
	onChange: (value: number) => void;
}

const Resizer: Component<ResizerProps> = (props) => {
	const [isResizing, setIsResizing] = createSignal(false);

	const isVertical = () =>
		props.position === "left" || props.position === "right";

	const positionClass = () => {
		switch (props.position) {
			case "top":
				return "-top-2 left-0 right-0";
			case "bottom":
				return "-bottom-2 left-0 right-0";
			case "left":
				return "-left-2 top-0 bottom-0";
			case "right":
				return "-right-2 top-0 bottom-0";
		}
	};

	let startPos = 0;
	let startVal = 0;

	const clamp = (v: number) => Math.max(props.min, Math.min(props.max, v));

	const handleMouseDown = (e: MouseEvent) => {
		e.preventDefault();
		startPos = isVertical() ? e.clientX : e.clientY;
		startVal = props.value;
		setIsResizing(true);
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isResizing()) return;
		const currentPos = isVertical() ? e.clientX : e.clientY;
		const delta = currentPos - startPos;
		const invert = props.position === "left" || props.position === "top";
		const newVal = clamp(startVal + (invert ? -delta : delta));
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

	const showGrip = () => props.grip !== false;

	return (
		<div
			class={`${styles.handle} ${isVertical() ? styles.vertical : styles.horizontal} ${isResizing() ? styles.active : ""} absolute z-10 flex items-center justify-center ${positionClass()} ${isVertical() ? "cursor-col-resize w-4 flex-col" : "cursor-row-resize h-4"}`}
			role="separator"
			tabIndex={0}
			aria-orientation={isVertical() ? "vertical" : "horizontal"}
			aria-valuenow={props.value}
			aria-valuemin={props.min}
			aria-valuemax={props.max}
			onMouseDown={handleMouseDown}
		>
			<div class={`${styles.grip} ${showGrip() ? "opacity-100" : "opacity-0"}`}>
				{isVertical() ? (
					<GripVertical class="w-3 h-3 text-base-content/40" />
				) : (
					<GripHorizontal class="w-3 h-3 text-base-content/40" />
				)}
			</div>
		</div>
	);
};

export default Resizer;
