import { GripHorizontal, GripVertical } from "lucide-solid";
import { type Component, createEffect, createSignal, onCleanup } from "solid-js";

import { cstyle } from "@/utils/cstyle";

interface ResizerProps {
	value: number;
	min: number;
	max: number;
	position: "top" | "bottom" | "left" | "right";
	grip?: boolean;
	onChange: (value: number) => void;
}

// ── Styles ──

const C = {
	handle: cstyle({
		display: "resizer-handle absolute z-10 flex items-center justify-center",
		variants: {
			vertical: {
				true: "resizer-handle-v cursor-col-resize w-4 flex-col",
				false: "resizer-handle-h cursor-row-resize h-4",
			},
			resizing: { true: "resizer-active" },
		},
	}),
	grip: cstyle({
		display: "resizer-grip",
		color: "bg-base-300",
		variants: {
			visible: { true: "opacity-100", false: "opacity-0" },
		},
	}),
};

const positionClass = (pos: ResizerProps["position"]) => {
	switch (pos) {
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

// ── Component ──

const Resizer: Component<ResizerProps> = (props) => {
	const [isResizing, setIsResizing] = createSignal(false);

	const isVertical = () => props.position === "left" || props.position === "right";

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
		props.onChange(clamp(startVal + (invert ? -delta : delta)));
	};

	const handleMouseUp = () => setIsResizing(false);

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

	const v = isVertical();
	const showGrip = () => props.grip !== false;

	return (
		<div
			class={`${C.handle({ vertical: v, resizing: isResizing() })} ${positionClass(props.position)}`}
			role="separator"
			tabIndex={0}
			aria-orientation={v ? "vertical" : "horizontal"}
			aria-valuenow={props.value}
			aria-valuemin={props.min}
			aria-valuemax={props.max}
			onMouseDown={handleMouseDown}
		>
			<div class={C.grip({ visible: showGrip() })}>
				{v ? (
					<GripVertical class="w-3 h-3 text-base-content/40" />
				) : (
					<GripHorizontal class="w-3 h-3 text-base-content/40" />
				)}
			</div>
		</div>
	);
};

export default Resizer;
