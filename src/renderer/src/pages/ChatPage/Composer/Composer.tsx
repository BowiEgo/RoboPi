import { Send } from "lucide-solid";
import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Resizer from "@/components/Resizer/Resizer";

export interface AgentConfig {
	model?: string;
	thinkingLevel?: string;
	availableModels?: string[];
	status?: string;
}

interface ComposerProps {
	onSend?: (text: string) => void;
	agentConfig?: AgentConfig;
	rainbow?: boolean;
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
	const parts = model.split("/");
	return parts[parts.length - 1] ?? model;
}

function thinkingLabel(
	t: string | undefined,
	fallback: (key: string) => string,
): string {
	if (!t) return fallback("composer.think");
	const key = THINKING_LABELS[t] ?? "composer.think";
	return fallback(key);
}

function statusLabel(
	status: string | undefined,
	t: (key: string) => string,
): string {
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
			class={`flex flex-col w-[90%] my-1 mb-3 rounded-xl border-base-300 relative ${isFocused() ? "border-accent" : ""} ${!props.rainbow ? "border" : ""}`}
			style={{ height: `${height()}px` }}
			onFocusIn={() => setIsFocused(true)}
			onFocusOut={() => setIsFocused(false)}
		>
			<Resizer
				value={height()}
				min={minH}
				max={maxH}
				position="top"
				grip={false}
				onChange={(v) => setHeight(v)}
			/>

			<div
				class={`h-full ${props.rainbow ? "aura aura-rainbow duration-6000" : ""}`}
			>
				<div class="card h-full bg-base-100 shadow-sm">
					{/* Toolbar */}
					<div class="flex items-center gap-1 px-4 py-2 shrink-0 min-h-9 border-b-1 border-base-300 bg-base-200">
						<button class="btn btn-ghost btn-xs" type="button">
							{statusLabel(cfg()?.status, t)}
						</button>
						<span class="w-px h-4 bg-base-300/25 shrink-0" />
						<button class="btn btn-ghost btn-xs" type="button">
							{shortenModel(cfg()?.model)}
						</button>
						<span class="w-px h-4 bg-base-300/25 shrink-0" />
						<button class="btn btn-ghost btn-xs" type="button">
							{t("composer.prompt")}
						</button>
						<span class="w-px h-4 bg-base-300/25 shrink-0" />
						<button class="btn btn-ghost btn-xs" type="button">
							{thinkingLabel(cfg()?.thinkingLevel, t)}
						</button>
					</div>

					{/* Input Area */}
					<div class="flex-1 flex items-center gap-2 mx-4 px-2 py-1 pl-3 rounded bg-base-100 border border-transparent overflow-hidden">
						<textarea
							ref={textareaRef}
							class="flex-1 min-h-6 border-none outline-none bg-transparent text-base-content font-display text-base leading-relaxed resize-none overflow-y-auto"
							placeholder={t("composer.placeholder")}
							value={inputText()}
							onInput={(e) => setInputText(e.currentTarget.value)}
							onKeyDown={handleKeyDown}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setIsFocused(false)}
						/>
						<button
							class="btn btn-circle btn-primary"
							type="button"
							onClick={send}
							disabled={!inputText().trim()}
						>
							<Send class="w-4 h-4" />
						</button>
					</div>

					{/* Footer */}
					<div class="flex items-center justify-between gap-1 px-4 py-2 shrink-0 min-h-9" />
				</div>
			</div>
		</div>
	);
};

export default Composer;
