import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Icon from "@/components/Icon";
import Resizer from "@/components/Resizer/Resizer";

import msgIcon from "@/assets/icons/message.svg?raw";

import styles from "./Composer.module.css";

export interface AgentConfig {
	model?: string;
	thinkingLevel?: string;
	availableModels?: string[];
	status?: string;
}

interface ComposerProps {
	onSend?: (text: string) => void;
	agentConfig?: AgentConfig;
}

const THINKING_LABELS: Record<string, string> = {
	off: "composer.think.off",
	minimal: "composer.think.minimal",
	low: "composer.think.low",
	medium: "composer.think.medium",
	high: "composer.think.high",
	xhigh: "composer.think.xhigh",
	max: "composer.think.max",
};

function shortenModel(model: string | undefined): string {
	if (!model) return "—";
	// 提取最后一个路径段作为简短名称
	const parts = model.split("/");
	return parts[parts.length - 1] ?? model;
}

function thinkingLabel(t: string | undefined, fallback: (key: string) => string): string {
	if (!t) return fallback("composer.think");
	const key = THINKING_LABELS[t] ?? "composer.think";
	return fallback(key);
}

function statusLabel(status: string | undefined, t: (key: string) => string): string {
	if (!status) return t("composer.mode");
	switch (status) {
		case "responding":
			return t("composer.mode.responding");
		case "thinking":
			return t("composer.mode.thinking");
		case "error":
			return t("composer.mode.error");
		default:
			return t("composer.mode.idle");
	}
}

const Composer: Component<ComposerProps> = (props) => {
	const { t } = useLocale();
	const [height, setHeight] = createSignal(160);
	const [isFocused, setIsFocused] = createSignal(false);
	const [inputText, setInputText] = createSignal("");

	let textareaRef: HTMLTextAreaElement | undefined;

	const minH = 120;
	const maxH = 400;

	function send() {
		const text = inputText().trim();
		if (!text) return;

		props.onSend?.(text);
		setInputText("");

		if (textareaRef) {
			textareaRef.style.height = "auto";
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	const cfg = () => props.agentConfig;

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
					{statusLabel(cfg()?.status, t)}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{shortenModel(cfg()?.model)}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{t("composer.prompt")}
				</button>
				<span class={styles.toolSep} />
				<button class={styles.toolBtn} type="button">
					{thinkingLabel(cfg()?.thinkingLevel, t)}
				</button>
			</div>

			{/* Input Area */}
			<div class={styles.inputArea}>
				<textarea
					ref={textareaRef}
					class={styles.input}
					placeholder={t("composer.placeholder")}
					value={inputText()}
					onInput={(e) => setInputText(e.currentTarget.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
				/>
				<button
					class={`${styles.sendBtn} rounded-full`}
					type="button"
					onClick={send}
					disabled={!inputText().trim()}
				>
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
