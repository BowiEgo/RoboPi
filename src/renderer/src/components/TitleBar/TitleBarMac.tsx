import type { Component } from "solid-js";

import styles from "./TitleBar.module.css";

/**
 * macOS 标题栏
 * titleBarStyle: 'hidden' 保留了原生的红/黄/绿交通灯按钮，
 * 这里仅提供一个可拖拽的空白区域。
 */
const TitleBarMac: Component = () => {
	return <div class={styles.macBar} />;
};

export default TitleBarMac;
