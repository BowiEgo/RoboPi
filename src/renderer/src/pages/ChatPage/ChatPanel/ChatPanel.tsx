import { Plus } from "lucide-solid";
import { type Component, createEffect, createMemo, createSignal, For, type JSX, Show } from "solid-js";

import ChatOutline from "@/components/ChatOutline/ChatOutline";

import Composer, { type AgentConfig } from "../Composer/Composer";
import ChatBubble, { type ChatBubbleProps } from "./ChatBubble";

export interface ChatTag {
	id: string;
	label: string;
	type?: "info" | "action";
	onClick?: (id: string) => void;
}

interface ChatPanelProps {
	header?: JSX.Element;
	tags?: ChatTag[];
	children?: JSX.Element;
	sessionId?: string;
	initialMessages?: ChatBubbleProps[];
	resetKey?: string;
	agentConfig?: AgentConfig;
	onSend?: (text: string) => Promise<unknown> | undefined;
}

const ChatPanel: Component<ChatPanelProps> = (props) => {
	const agentConfig = () => props.agentConfig ?? {};

	// Messages come directly from the store (via props.initialMessages).
	// No local state — the store is the single source of truth.
	const messages = () => props.initialMessages ?? [];

	// ── Scroll ──

	let scrollEl: HTMLElement | undefined;
	let suppressScrollEvent = false;

	const [isNearBottom, setIsNearBottom] = createSignal(true);

	const onScroll = () => {
		if (suppressScrollEvent || !scrollEl) return;
		const el = scrollEl;
		setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= 4);
	};

	const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
		if (!scrollEl) return;
		suppressScrollEvent = true;
		scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior });
		// Re-enable after animation frame + buffer
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				suppressScrollEvent = false;
				setIsNearBottom(true);
			});
		});
	};

	// Instant jump to last user message on session switch / new message.
	// If the session is streaming, follow with instant scroll to bottom.
	let lastMsgId = "";
	createEffect(() => {
		const msgs = messages();
		if (msgs.length === 0) return;
		const latestId = msgs[msgs.length - 1].id ?? "";
		if (latestId !== lastMsgId) {
			lastMsgId = latestId;
			const streaming = msgs[msgs.length - 1].streaming;
			queueMicrotask(() => {
				const userBubbles = document.querySelectorAll('[data-role="user"]');
				const lastUser = userBubbles[userBubbles.length - 1];
				lastUser?.scrollIntoView({ block: "start" });
				if (streaming && scrollEl) {
					scrollEl.scrollTop = scrollEl.scrollHeight;
				}
			});
		}
	});

	// Smooth scroll to bottom while streaming — only when user is near bottom.
	createEffect(() => {
		const msgs = messages();
		if (msgs.length === 0) return;
		const last = msgs[msgs.length - 1];
		void last.content.length;
		if (!last.streaming || !isNearBottom()) return;
		scrollToBottom("smooth");
	});

	// ── Test data ──
	const TEST_MESSAGES: ChatBubbleProps[] = [
		{
			id: "test-1",
			role: "user",
			content: "Hello! Can you help me analyze this image?",
			files: [
				{
					name: "screenshot.png",
					size: 245760,
					type: "image/png",
					preview: "https://img.daisyui.com/images/profile/demo/kenobee@192.webp",
				},
				{ name: "data.json", size: 1024, type: "application/json" },
			],
			timestamp: "14:30",
		},
		{
			id: "test-2",
			role: "agent",
			content:
				'Sure! Here is a **markdown** response:\n\n## Analysis\n\n- ✅ The image looks good\n- ✅ The JSON is valid\n\n```json\n{"status": "ok"}\n```\n\n> Tip: always validate your data.',
			thinking: "1. Check the image format...\n2. Parse JSON structure...\n3. All valid, generating reply...",
			timestamp: "14:30",
		},
		{
			id: "test-3",
			role: "user",
			content: "What about code review?",
			timestamp: "14:31",
		},
		{
			id: "test-4",
			role: "agent",
			content: "",
			thinking: "Analyzing the code review request...",
			streaming: true,
			timestamp: "14:31",
		},
		{
			id: "test-5",
			role: "agent",
			content:
				"Here is the code review result:\n\n1. **Naming**: variables are well-named\n2. **Structure**: consider extracting the `parse` function\n3. **Performance**: the loop at line 42 could",
			thinking: "Scanning repository...\nAnalyzing code patterns...\nFound 3 suggestions...",
			streaming: true,
			timestamp: "14:32",
		},
	];

	const [isTestMode, setIsTestMode] = createSignal(false);

	function toggleTestMessages() {
		setIsTestMode((v) => !v);
	}

	const displayMessages = createMemo(() => (isTestMode() ? TEST_MESSAGES : messages()));

	const hasStreaming = createMemo(() => displayMessages().some((m) => m.role === "agent" && m.streaming));

	// Retryable user messages: last user msg whose agent response failed or is missing
	const retryableIds = createMemo(() => {
		const msgs = displayMessages();
		if (hasStreaming()) return new Set<string>();
		const ids = new Set<string>();
		for (let i = 0; i < msgs.length; i++) {
			if (msgs[i].role !== "user") continue;
			const next = msgs[i + 1];
			// No agent reply, or agent reply is empty/error and not streaming
			if (next?.role !== "agent") {
				ids.add(msgs[i].id ?? "");
			} else if (!next.streaming && (!next.content || next.content.startsWith("❌ Error:"))) {
				ids.add(msgs[i].id ?? "");
			}
		}
		return ids;
	});

	function handleSend(text: string) {
		if (!text.trim()) return;
		// Delegate to the store — it inserts bubbles + sends IPC
		props.onSend?.(text.trim());
	}

	// Prevent sending while agent is streaming
	void hasStreaming();

	return (
		<div class="chat-panel relative flex flex-col items-center h-full overflow-hidden">
			<ChatOutline messages={displayMessages()} />
			<header class="absolute flex shrink-0 items-center justify-between w-full gap-4 px-4 py-3 font-medium text-base font-display bg-transparent! text-base-content z-1">
				{props.header}
				{props.tags && props.tags.length > 0 && (
					<div class="flex items-center gap-2 ml-auto">
						<For each={props.tags}>
							{(tag) =>
								tag.type === "action" ? (
									<button
										type="button"
										class="btn btn-ghost btn-sm text-base-content"
										onClick={() => tag.onClick?.(tag.id)}
									>
										<Plus class="w-3 h-3" />
										{tag.label}
									</button>
								) : (
									<span class="inline-flex items-center px-2.5 py-0.75 border border-base-300 rounded bg-base-200 text-base-content/70 font-mono text-[11px] leading-snug whitespace-nowrap">
										{tag.label}
									</span>
								)
							}
						</For>
					</div>
				)}
				<button
					type="button"
					class={`btn btn-xs ml-auto ${isTestMode() ? "btn-primary" : "btn-outline"}`}
					onClick={toggleTestMessages}
				>
					🧪 {isTestMode() ? "Clear" : "Test"}
				</button>
			</header>

			<main
				ref={(el) => {
					scrollEl = el;
				}}
				class="flex-1 w-full flex flex-col gap-1 overflow-y-auto pl-12 pr-20 pt-12 pb-[20%] text-base-content z-0"
				style="scroll-behavior: auto; scroll-padding-top: 64px; scroll-padding-bottom: 96px"
				onScroll={onScroll}
			>
				<Show when={displayMessages().length === 0} fallback={null}>
					{props.children ?? (
						<div class="flex items-center justify-center flex-1 text-base-content/30 text-sm">
							Send a message to start
						</div>
					)}
				</Show>
				<For each={displayMessages()}>
					{(msg) => (
						<div data-role={msg.role} id={`msg-${msg.id}`}>
							<ChatBubble
								id={msg.id}
								role={msg.role}
								content={msg.content}
								files={msg.files}
								thinking={msg.thinking}
								timestamp={msg.timestamp}
								avatar={msg.avatar}
								streaming={msg.streaming}
								onRetry={
									msg.role === "user" && retryableIds().has(msg.id ?? "") ? () => handleSend(msg.content) : undefined
								}
							/>
						</div>
					)}
				</For>

				<div
					class="pointer-events-none absolute top-0 left-0 right-0 h-1/12 backdrop-blur-md
 bg-linear-to-b from-base-100 to-transparent"
					style="mask-image: linear-gradient(to bottom, black 30%, transparent 100%);
 -webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 100%);"
				/>
				<div
					class="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 backdrop-blur-lg
 bg-linear-to-b from-transparent to-base-100"
					style="mask-image: linear-gradient(to top, black 30%, transparent 100%);
 -webkit-mask-image: linear-gradient(to top, black 30%, transparent 100%);"
				/>
			</main>

			<Composer onSend={handleSend} agentConfig={agentConfig()} rainbow={true} />
		</div>
	);
};

export default ChatPanel;
