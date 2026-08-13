import { Send } from "lucide-solid";
import { type Component, createSignal, For, onCleanup, onMount, Show } from "solid-js";

import type { ConfiguredModel } from "@shared/agent-types";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import Dropdown, { type DropdownOption } from "@/components/Dropdown/Dropdown";
import ProviderIcon from "@/components/ProviderIcon/ProviderIcon";
import Resizer from "@/components/Resizer/Resizer";

import { cstyle } from "@/utils/cstyle";

export interface AgentConfig {
	model?: string;
	thinkingLevel?: string;
	availableThinkingLevels?: string[];
	configuredModels?: ConfiguredModel[];
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
	dropdownBtn: cstyle({
		display: "btn btn-ghost btn-xs",
		spacing: "gap-1.5",
		interaction: "rounded-lg mr-3 transition-none border-1",
		color: "bg-app-raised text-base-content border-base-content/15",
	}),
	dropdownMenu: cstyle({
		display: "absolute bottom-full left-0 z-50 menu flex flex-col flex-nowrap",
		spacing: "mb-2 p-2",
		sizing: "max-h-48 overflow-y-auto",
		interaction: "rounded-box shadow-xl border-1",
		color: "bg-base-200 text-base-content border-base-300",
	}),

	toolbar: cstyle({
		display: "absolute flex items-center",
		sizing: "w-full shrink-0 min-h-9",
		spacing: "top-[-50px] gap-1 px-4 py-2",
	}),
	inputArea: cstyle({
		display: "flex items-center",
		sizing: "flex-1 overflow-hidden",
		spacing: "gap-2 mx-4 px-2 py-1 pl-3",
		color: "",
	}),
	textarea: cstyle({
		display: "border-none outline-none bg-transparent resize-none",
		sizing: "flex-1 min-h-6 overflow-y-auto",
		text: "font-display text-base leading-relaxed",
	}),
	sendBtn: cstyle({ display: "btn btn-circle btn-primary" }),
	wrapper: cstyle({
		display: "absolute flex flex-col",
		sizing: "w-[70%]",
		spacing: "bottom-[3%]",
		interaction: "rounded-3xl shadow-xl border-1",
		color: "input-field border-base-200",
	}),
	wrapperFocused: cstyle({ interaction: "border-accent" }),
	aura: cstyle({
		display: "flex flex-col",
		sizing: "h-full",
		interaction: "rounded-3xl aura aura-xs aura-pulse aura-rainbow-full duration-6000",
	}),
	card: cstyle({ display: "card opacity-100", sizing: "h-full", interaction: "rounded-3xl", color: "bg-base-100" }),
	footer: cstyle({ display: "flex items-center justify-between", sizing: "shrink-0", spacing: "px-4 py-2" }),
};

interface DropdownItem {
	label: string;
	active?: boolean;
	onClick?: () => void;
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
				class={C.dropdownBtn()}
				type="button"
				onClick={toggle}
				aria-expanded={open()}
				aria-haspopup="menu"
			>
				{props.label}
			</button>
			<Show when={open()}>
				<ul ref={menuRef} class={C.dropdownMenu()} style={{ width: props.width ?? "18rem" }}>
					<For each={props.items}>
						{(item) => (
							<li>
								<a
									class={item.active ? "active" : ""}
									onClick={(_e) => {
										item.onClick?.();
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
	const { selectModel, selectThinkingLevel } = useAgent();

	const statusItems = (): DropdownItem[] => [
		{ label: props.t("composer.mode.idle") },
		{ label: props.t("composer.mode.responding") },
	];
	const modelOptions = (): DropdownOption[] =>
		(props.cfg?.configuredModels ?? []).map((m) => ({
			id: m.id,
			name: shortenModel(m.id),
			group: m.provider,
			groupIcon: <ProviderIcon provider={m.provider} size="w-4 h-4" textClass="text-[8px]" />,
		}));
	const promptItems = (): DropdownItem[] => [
		{ label: `${props.t("composer.prompt")} 1` },
		{ label: `${props.t("composer.prompt")} 2` },
	];
	const thinkingItems = (): DropdownItem[] => {
		const available = props.cfg?.availableThinkingLevels;
		const levels = available && available.length > 0 ? available : Object.keys(THINKING_LABELS);
		return levels.map((k) => ({
			label: props.t(THINKING_LABELS[k] ?? k),
			active: k === props.cfg?.thinkingLevel,
			onClick: () => selectThinkingLevel(k),
		}));
	};

	return (
		<div class={C.toolbar()}>
			<DropdownMenu label={statusLabel(props.cfg?.status, props.t)} width="18rem" items={statusItems()} />
			<Dropdown
				value={props.cfg?.model ?? ""}
				options={modelOptions()}
				placeholder={props.t("composer.model")}
				width="22rem"
				direction="up"
				triggerClass={C.dropdownBtn()}
				onChange={selectModel}
			/>
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
	<div class={C.inputArea()}>
		<textarea
			ref={props.ref}
			class={C.textarea()}
			placeholder={props.placeholder}
			value={props.inputText}
			onInput={props.onInput}
			onKeyDown={props.onKeyDown}
			onFocus={props.onFocus}
			onBlur={props.onBlur}
		/>
		<button class={C.sendBtn()} type="button" onClick={props.onSend} disabled={props.disabled}>
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
	const wrapperClass = () => `${C.wrapper()} ${isFocused() ? C.wrapperFocused() : ""}`;

	return (
		<div
			class={wrapperClass()}
			style={{ height: `${height()}px` }}
			onFocusIn={() => setIsFocused(true)}
			onFocusOut={() => setIsFocused(false)}
		>
			<Resizer value={height()} min={minH} max={maxH} position="top" grip={false} onChange={(v) => setHeight(v)} />
			<Toolbar cfg={cfg()} t={t} />
			<div class={C.aura()}>
				<div class={C.card()}>
					<InputArea
						inputText={inputText()}
						onInput={(e) => setInputText((e.currentTarget as HTMLTextAreaElement).value)}
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
					<div class={C.footer()} />
				</div>
			</div>
		</div>
	);
};

export default Composer;
