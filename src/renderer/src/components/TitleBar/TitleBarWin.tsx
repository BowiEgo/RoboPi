import { type Component, createSignal } from "solid-js";

import { cstyle } from "@/utils/cstyle";

// ── Styles ──

const C = {
	root: cstyle({
		display: "absolute flex items-center justify-end",
		sizing: "shrink-0",
		interaction: "select-none",
		color: "bg-transparent",
	}),
	dragRegion: cstyle({ display: "absolute inset-0 right-25" }),
	controls: cstyle({
		display: "flex items-center",
		sizing: "h-full",
	}),
	btn: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-9.5 h-full",
		interaction: "border-none bg-transparent transition",
		color: "text-base-content/55",
		variants: {
			kind: {
				normal: "hover:text-base-content hover:bg-base-300",
				close: "w-[38px] hover:text-white hover:bg-[#e81123]",
			},
		},
	}),
};

// ── Component ──

const TitleBarWin: Component = () => {
	const [isMaximized] = createSignal(false);

	const onMinimize = () => window.api.minimize();
	const onMaximize = () => window.api.maximize();
	const onClose = () => window.api.close();

	return (
		<div class={C.root()}>
			{/* Draggable region */}
			<div class={C.dragRegion()} style="-webkit-app-region: drag" />

			{/* Window controls */}
			<div class={C.controls()} style="-webkit-app-region: no-drag">
				<button type="button" class={C.btn({ kind: "normal" })} onClick={onMinimize} aria-label="Minimize">
					<svg width="10" height="10" viewBox="0 0 10 10">
						<rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
					</svg>
				</button>
				<button
					type="button"
					class={C.btn({ kind: "normal" })}
					onClick={onMaximize}
					aria-label={isMaximized() ? "Restore" : "Maximize"}
				>
					<svg width="10" height="10" viewBox="0 0 10 10">
						<rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" />
					</svg>
				</button>
				<button type="button" class={C.btn({ kind: "close" })} onClick={onClose} aria-label="Close">
					<svg width="10" height="10" viewBox="0 0 10 10">
						<path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		</div>
	);
};

export default TitleBarWin;
