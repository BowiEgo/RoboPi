import type { Component } from "solid-js";

/**
 * macOS title bar.
 * With titleBarStyle: 'hidden', native traffic-light buttons are retained.
 * This just provides a draggable empty region.
 */
const TitleBarMac: Component = () => {
	return (
		<div
			class="absolute top-0 w-screen h-8 shrink-0 bg-app select-none bg-transparent"
			style="-webkit-app-region: drag"
		/>
	);
};

export default TitleBarMac;
