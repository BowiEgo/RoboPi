import type { Component } from "solid-js";

import TitleBarMac from "./TitleBarMac";
import TitleBarWin from "./TitleBarWin";

/**
 * 根据运行平台自动切换标题栏：
 * - macOS → TitleBarMac（仅拖拽区，使用原生交通灯按钮）
 * - Windows / Linux → TitleBarWin（自定义窗口控制按钮）
 */
const TitleBar: Component = () => {
	const isMac = () => window.api.platform === "darwin";

	return isMac() ? <TitleBarMac /> : <TitleBarWin />;
};

export default TitleBar;
