import { type Component, createSignal } from "solid-js";

import styles from "./TitleBar.module.css";

const TitleBarWin: Component = () => {
	const [isMaximized, setIsMaximized] = createSignal(false);

	const onMinimize = () => window.api.minimize();
	const onMaximize = () => window.api.maximize();
	const onClose = () => window.api.close();

	return (
		<div class={styles.winBar}>
			<div class={styles.dragRegion} />
			<div class={styles.controls}>
				<button
					class={`${styles.controlBtn} ${styles.minimize}`}
					onClick={onMinimize}
					aria-label="Minimize"
				>
					<svg width="10" height="10" viewBox="0 0 10 10">
						<rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
					</svg>
				</button>
				<button
					class={`${styles.controlBtn} ${styles.maximize}`}
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
					class={`${styles.controlBtn} ${styles.close}`}
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
