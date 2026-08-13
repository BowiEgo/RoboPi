import type { Component } from "solid-js";

import { cstyle } from "@/utils/cstyle";

/**
 * macOS title bar.
 * With titleBarStyle: 'hidden', native traffic-light buttons are retained.
 * This just provides a draggable empty region.
 */

const C = {
	bar: cstyle({
		display: "absolute top-0",
		sizing: "w-screen h-8 shrink-0",
		interaction: "select-none",
		color: "bg-app bg-transparent",
	}),
};

const TitleBarMac: Component = () => {
	return <div class={C.bar()} style="-webkit-app-region: drag" />;
};

export default TitleBarMac;
