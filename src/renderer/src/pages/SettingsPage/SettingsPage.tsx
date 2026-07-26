import type { Component } from "solid-js";
import styles from "./SettingsPage.module.css";
import Versions from "../../components/Versions/Versions";

const SettingsPage: Component = () => {
	return (
		<div class={styles.page}>
			<h1 class={styles.title}>Settings</h1>
			<p class={styles.desc}>应用设置（待实现）</p>
			<Versions />
		</div>
	);
};

export default SettingsPage;
