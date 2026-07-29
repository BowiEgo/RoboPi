import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Icon from "@/components/Icon";
import Resizer from "@/components/Resizer/Resizer";

import msgIcon from "@/assets/icons/message.svg?raw";

import styles from "./Composer.module.css";

const Composer: Component = () => {
	const { t } = useLocale();
	const [height, setHeight] = createSignal(160);
	const [isFocused, setIsFocused] = createSignal(false);

	const minH = 120;
	const maxH = 400;

	return (
		<div
			class={`${styles.composer} ${isFocused() ? styles.focused : ""} rounded-md`}
			style={{ height: `${height()}px` }}
			onFocusIn={() => setIsFocused(true)}
			onFocusOut={() => setIsFocused(false)}
		>
			<Resizer
				value={height()}
				min={minH}
				max={maxH}
				orientation="vertical"
				onChange={(v) => setHeight(v)}
			/>

			{/* Toolbar */}
			<div class={styles.toolbar}>
				<button class={styles.toolBtn} type="button">
					{t("composer.mode")}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{t("composer.model")}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{t("composer.prompt")}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{t("composer.think")}
				</button>
			</div>

			{/* Input Area */}
			<div class={styles.inputArea}>
				<textarea
					class={styles.input}
					placeholder={t("composer.placeholder")}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
				/>
				<button class={`${styles.sendBtn} rounded-full`} type="button">
					<span class={styles.sendIcon}>
						<Icon raw={msgIcon} />
					</span>
				</button>
			</div>

			{/* Footer */}
			<div class={styles.footer}>
				<span class={styles.footerMeta} />
			</div>
		</div>
	);
};

export default Composer;
