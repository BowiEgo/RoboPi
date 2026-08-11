import { Send } from "lucide-solid";
import { type Component, createSignal, For, onCleanup, onMount, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Resizer from "@/components/Resizer/Resizer";

import { cx } from "@/utils/cx";

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
function thinkingLabel(lvl: string | undefined, fallback: (key: string) => string): string {
	if (!lvl) return fallback("composer.think");
	return fallback(THINKING_LABELS[lvl] ?? "composer.think");
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

const C = {
	dropdownBtn: {
		display: "btn btn-ghost btn-xs",
		interaction: "rounded-lg mr-3 transition-none border-1",
		color: "bg-app-raised text-base-content border-base-content/15",
	},

	toolbar: {
		display: "absolute flex items-center",
		sizing: "w-full shrink-0 min-h-9",
		spacing: "top-[-50px] gap-1 px-4 py-2",
	},
	inputArea: {
		display: "flex items-center",
		sizing: "flex-1 overflow-hidden",
		spacing: "gap-2 mx-4 px-2 py-1 pl-3",
		color: "",
	},
	textarea: {
		display: "border-none outline-none bg-transparent resize-none",
		sizing: "flex-1 min-h-6 overflow-y-auto",
		text: "font-display text-base leading-relaxed",
	},
	sendBtn: { display: "btn btn-circle btn-primary" },
	wrapper: {
		display: "absolute flex flex-col",
		sizing: "w-[70%]",
		spacing: "bottom-[6%]",
		interaction: "rounded-3xl shadow-xl border-1",
		color: "input-field border-base-300",
	},
	wrapperFocused: { interaction: "border-accent" },
	aura: { display: "flex flex-col", sizing: "h-full", interaction: "rounded-3xl" },
	card: { display: "card", sizing: "h-full", interaction: "rounded-3xl", color: "bg-base-100" },
	footer: { display: "flex items-center justify-between", sizing: "shrink-0", spacing: "px-4 py-2" },
};

interface DropdownItem {
	label: string;
	active?: boolean;
}
interface DropdownMenuProps {
	label: string;
	width?: string;
	items: DropdownItem[];
}

const DropdownMenu: Component<DropdownMenuProps> = (props) => {
	const [open, setOpen] = createSignal(false);
	let btnRef: HTMLButtonElement | undefined;
	let menuRef: HTMLUListElement | undefined;

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		setOpen((v) => !v);
	}

	function close() {
		setOpen(false);
	}

	// Click outside to close
	function onDocClick(e: MouseEvent) {
		if (menuRef && !menuRef.contains(e.target as Node) && btnRef && !btnRef.contains(e.target as Node)) {
			close();
		}
	}

	// Escape to close
	function onDocKey(e: KeyboardEvent) {
		if (e.key === "Escape") close();
	}

	onMount(() => {
		document.addEventListener("click", onDocClick);
		document.addEventListener("keydown", onDocKey);
	});

	onCleanup(() => {
		document.removeEventListener("click", onDocClick);
		document.removeEventListener("keydown", onDocKey);
	});

	return (
		<div class="relative">
			<button
				ref={btnRef}
				class={cx(C.dropdownBtn)}
				type="button"
				onClick={toggle}
				aria-expanded={open()}
				aria-haspopup="menu"
			>
				{props.label}
			</button>
			<Show when={open()}>
				<ul
					ref={menuRef}
					class="absolute bottom-full left-0 mb-2 menu flex flex-col flex-nowrap bg-base-200 text-base-content rounded-box shadow-xl border-1 z-50 p-2 max-h-48 overflow-y-auto border-base-300"
					style={{ width: props.width ?? "18rem" }}
					role="menu"
				>
					<For each={props.items}>
						{(item) => (
							<li role="menuitem">
								<a
									class={item.active ? "active" : ""}
									onClick={(e) => {
										e.preventDefault();
										close();
									}}
								>
									{item.label}
								</a>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</div>
	);
};

interface ToolbarProps {
	cfg?: AgentConfig;
	t: (key: string) => string;
}

const Toolbar: Component<ToolbarProps> = (props) => {
	const statusItems = (): DropdownItem[] => [
		{ label: props.t("composer.mode.idle") },
		{ label: props.t("composer.mode.responding") },
	];
	const modelItems = (): DropdownItem[] =>
		(props.cfg?.availableModels ?? []).map((m) => ({ label: shortenModel(m), active: m === props.cfg?.model }));
	const promptItems = (): DropdownItem[] => [
		{ label: `${props.t("composer.prompt")} 1` },
		{ label: `${props.t("composer.prompt")} 2` },
	];
	const thinkingItems = (): DropdownItem[] =>
		Object.keys(THINKING_LABELS).map((k) => ({ label: props.t(THINKING_LABELS[k]) }));

	return (
		<div class={cx(C.toolbar)}>
			<DropdownMenu label={statusLabel(props.cfg?.status, props.t)} width="18rem" items={statusItems()} />
			<DropdownMenu label={shortenModel(props.cfg?.model)} width="22rem" items={modelItems()} />
			<DropdownMenu label={props.t("composer.prompt")} width="20rem" items={promptItems()} />
			<DropdownMenu label={thinkingLabel(props.cfg?.thinkingLevel, props.t)} width="18rem" items={thinkingItems()} />
		</div>
	);
};

interface InputAreaProps {
	inputText: string;
	onInput: (e: InputEvent) => void;
	onKeyDown: (e: KeyboardEvent) => void;
	onFocus: () => void;
	onBlur: () => void;
	onSend: () => void;
	placeholder: string;
	disabled: boolean;
	ref?: (el: HTMLTextAreaElement) => void;
}

const InputArea: Component<InputAreaProps> = (props) => (
	<div class={cx(C.inputArea)}>
		<textarea
			ref={props.ref}
			class={cx(C.textarea)}
			placeholder={props.placeholder}
			value={props.inputText}
			onInput={props.onInput}
			onKeyDown={props.onKeyDown}
			onFocus={props.onFocus}
			onBlur={props.onBlur}
		/>
		<button class={cx(C.sendBtn)} type="button" onClick={props.onSend} disabled={props.disabled}>
			<Send class="w-4 h-4" />
		</button>
	</div>
);

const Composer: Component<ComposerProps> = (props) => {
	const { t } = useLocale();
	const [height, setHeight] = createSignal(160);
	const [isFocused, setIsFocused] = createSignal(false);
	const [inputText, setInputText] = createSignal("");
	let textareaRef: HTMLTextAreaElement | undefined;
	const minH = 120,
		maxH = 400;

	function send() {
		const text = inputText().trim();
		if (!text) return;
		props.onSend?.(text);
		setInputText("");
		if (textareaRef) textareaRef.style.height = "auto";
	}
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
	const cfg = () => props.agentConfig;
	const wrapperClass = () => `${cx(C.wrapper)} ${isFocused() ? cx(C.wrapperFocused) : ""}`;

	return (
		<div
			class={wrapperClass()}
			style={{ height: `${height()}px` }}
			onFocusIn={() => setIsFocused(true)}
			onFocusOut={() => setIsFocused(false)}
		>
			<Resizer value={height()} min={minH} max={maxH} position="top" grip={false} onChange={(v) => setHeight(v)} />
			<Toolbar cfg={cfg()} t={t} />
			<div class={`${cx(C.aura)} ${"aura aura-xs aura-rainbow duration-6000"}`}>
				<div class={cx(C.card)}>
					<InputArea
						inputText={inputText()}
						onInput={(e) => setInputText(e.currentTarget.value)}
						onKeyDown={handleKeyDown}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						onSend={send}
						placeholder={t("composer.placeholder")}
						disabled={!inputText().trim()}
						ref={(el) => {
							textareaRef = el;
						}}
					/>
					<div class={cx(C.footer)} />
				</div>
			</div>
		</div>
	);
};

export default Composer;
