import type { Component } from "solid-js";

/**
 * macOS title bar.
 * With titleBarStyle: 'hidden', native traffic-light buttons are retained.
 * This just provides a draggable empty region.
 */
const TitleBarMac: Component = () => {
	return (
		<div
			class="h-8 shrink-0 bg-base-300 select-none"
			style="-webkit-app-region: drag"
		/>
	);
};

export default TitleBarMac;
