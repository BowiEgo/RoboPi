import type { Component } from "solid-js";

import TitleBarMac from "./TitleBarMac";
import TitleBarWin from "./TitleBarWin";

/**
 * Auto-switch the title bar based on the running platform:
 * - macOS → TitleBarMac (drag-only area, native traffic-light buttons)
 * - Windows / Linux → TitleBarWin (custom window control buttons)
 *
 * Browser build: no native window controls — render nothing.
 */
const TitleBar: Component = () => {
	if (!window.api) return null;

	const isMac = () => window.api.platform === "darwin";

	return isMac() ? <TitleBarMac /> : <TitleBarWin />;
};

export default TitleBar;
