import { type Component, createSignal } from "solid-js";

const TitleBarWin: Component = () => {
	const [isMaximized] = createSignal(false);

	const onMinimize = () => window.api.minimize();
	const onMaximize = () => window.api.maximize();
	const onClose = () => window.api.close();

	return (
		<div class="relative flex items-center justify-end shrink-0 bg-base-300 select-none">
			{/* Draggable region */}
			<div class="absolute inset-0 right-25" style="-webkit-app-region: drag" />

			{/* Window controls */}
			<div class="flex items-center h-full" style="-webkit-app-region: no-drag">
				<button
					type="button"
					class="flex items-center justify-center w-9.5 h-full border-none bg-transparent text-base-content/55 hover:text-base-content hover:bg-base-300 transition"
					onClick={onMinimize}
					aria-label="Minimize"
				>
					<svg width="10" height="10" viewBox="0 0 10 10">
						<rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
					</svg>
				</button>
				<button
					type="button"
					class="flex items-center justify-center w-9.5 h-full border-none bg-transparent text-base-content/55 hover:text-base-content hover:bg-base-300 transition"
					onClick={onMaximize}
					aria-label={isMaximized() ? "Restore" : "Maximize"}
				>
					<svg width="10" height="10" viewBox="0 0 10 10">
						<rect
							x="1.5"
							y="1.5"
							width="7"
							height="7"
							rx="1"
							fill="none"
							stroke="currentColor"
							stroke-width="1.2"
						/>
					</svg>
				</button>
				<button
					type="button"
					class="flex items-center justify-center w-[38px] h-full border-none bg-transparent text-base-content/55 hover:text-white hover:bg-[#e81123] transition"
					onClick={onClose}
					aria-label="Close"
				>
					<svg width="10" height="10" viewBox="0 0 10 10">
						<path
							d="M1 1L9 9M9 1L1 9"
							stroke="currentColor"
							stroke-width="1.2"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
};

export default TitleBarWin;
