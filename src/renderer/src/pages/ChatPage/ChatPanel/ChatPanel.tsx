import { Plus } from "lucide-solid";
import { type Component, createEffect, createMemo, createSignal, For, type JSX, Show } from "solid-js";

import ChatOutline from "@/components/ChatOutline/ChatOutline";
import { useAutoScroll } from "@/hooks/useAutoScroll";

import Composer, { type AgentConfig } from "../Composer/Composer";
import ChatBubble, { type ChatBubbleProps } from "./ChatBubble";
import { cstyle } from "@/utils/cstyle";

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

// ── Styles ──

const C = {
	root: cstyle({
		display: "chat-panel relative flex flex-col items-center",
		sizing: "h-full overflow-hidden",
		interaction: "rounded-2xl shadow-xl",
		color: "bg-app",
	}),
	header: cstyle({
		display: "absolute flex shrink-0 items-center justify-between z-1",
		sizing: "w-full",
		spacing: "gap-4 px-4 py-3",
		text: "font-medium text-base font-display",
		color: "bg-transparent! text-base-content",
	}),
	tags: cstyle({ display: "flex items-center", spacing: "gap-2 ml-auto" }),
	tagAction: cstyle({ display: "btn btn-ghost btn-sm", color: "text-base-content" }),
	tagInfo: cstyle({
		display: "inline-flex items-center",
		spacing: "px-2.5 py-0.75",
		interaction: "border rounded",
		text: "font-mono text-[11px] leading-snug whitespace-nowrap",
		color: "border-base-300 bg-base-200 text-base-content/70",
	}),
	testBtn: cstyle({
		display: "btn btn-xs",
		spacing: "ml-auto",
		variants: { active: { true: "btn-primary", false: "btn-outline" } },
	}),
	messages: cstyle({
		display: "flex flex-col",
		sizing: "flex-1 w-full overflow-y-auto z-0",
		spacing: "gap-1 pl-12 pr-20 pt-12 pb-[30%]",
		color: "text-base-content",
	}),
	empty: cstyle({
		display: "flex items-center justify-center",
		sizing: "flex-1",
		text: "text-sm",
		color: "text-base-content/30",
	}),
	fadeTop: cstyle({
		display: "pointer-events-none absolute top-0 left-0 right-0",
		sizing: "h-1/12",
		interaction: "backdrop-blur-md",
		color: "bg-linear-to-b from-base-100 to-transparent",
	}),
	fadeBottom: cstyle({
		display: "pointer-events-none absolute bottom-0 left-0 right-0",
		sizing: "h-1/3",
		interaction: "backdrop-blur-lg",
		color: "bg-linear-to-b from-transparent to-base-100",
	}),
};

const ChatPanel: Component<ChatPanelProps> = (props) => {
	const agentConfig = () => props.agentConfig ?? {};

	// Messages come directly from the store (via props.initialMessages).
	// No local state — the store is the single source of truth.
	const messages = () => props.initialMessages ?? [];

	const autoScroll = useAutoScroll(messages);

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

	// ── Incremental render ──
	// Only the most recent PAGE_SIZE messages are mounted; scrolling to the
	// top reveals earlier ones. Markdown rendering is the main source of
	// switch latency on long sessions, so we keep the mounted set small.
	const PAGE_SIZE = 10;
	const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
	let scrollEl: HTMLElement | undefined;

	const visibleMessages = createMemo(() => {
		const all = displayMessages();
		if (all.length <= visibleCount()) return all;
		return all.slice(all.length - visibleCount());
	});

	const hasMore = createMemo(() => visibleMessages().length < displayMessages().length);

	// Reset the window when switching sessions.
	createEffect(() => {
		props.resetKey;
		setVisibleCount(PAGE_SIZE);
	});

	let pendingScrollAnchor = 0;
	function loadMore() {
		if (!scrollEl || !hasMore()) return;
		// Anchor the viewport to the content bottom so earlier messages appear
		// above without shifting what the user is currently reading.
		pendingScrollAnchor = scrollEl.scrollHeight - scrollEl.scrollTop;
		setVisibleCount((c) => Math.min(c + PAGE_SIZE, displayMessages().length));
	}

	// Restore the anchor after the longer list has rendered.
	createEffect(() => {
		visibleCount();
		if (pendingScrollAnchor && scrollEl) {
			scrollEl.scrollTop = scrollEl.scrollHeight - pendingScrollAnchor;
			pendingScrollAnchor = 0;
		}
	});

	// ── Outline jump ──
	// Jumping to a not-yet-rendered message first expands the window to
	// include it, then scrolls to it once mounted.
	const [revealRequest, setRevealRequest] = createSignal<{ id: string } | null>(null);

	function revealMessage(domId: string) {
		const all = displayMessages();
		const idx = all.findIndex((m) => `msg-${m.id}` === domId);
		if (idx < 0) return;
		setVisibleCount((c) => Math.max(c, all.length - idx));
		setRevealRequest({ id: domId });
	}

	createEffect(() => {
		const req = revealRequest();
		if (!req || !scrollEl) return;
		const el = document.getElementById(req.id);
		if (!el) return;
		setRevealRequest(null);
		const SCROLL_OFFSET = 80;
		const elTop = el.getBoundingClientRect().top;
		const containerTop = scrollEl.getBoundingClientRect().top;
		scrollEl.scrollTo({ top: scrollEl.scrollTop + elTop - containerTop - SCROLL_OFFSET, behavior: "auto" });
	});

	function setRef(el: HTMLElement) {
		scrollEl = el;
		autoScroll.setScrollEl(el);
	}

	function handleScroll(e: Event) {
		autoScroll.onScroll();
		const el = e.currentTarget as HTMLElement;
		if (el.scrollTop < 160) loadMore();
	}

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
		<div class={C.root()}>
			<ChatOutline messages={displayMessages()} onJump={revealMessage} />
			<header class={C.header()}>
				{props.header}
				{props.tags && props.tags.length > 0 && (
					<div class={C.tags()}>
						<For each={props.tags}>
							{(tag) =>
								tag.type === "action" ? (
									<button type="button" class={C.tagAction()} onClick={() => tag.onClick?.(tag.id)}>
										<Plus class="w-3 h-3" />
										{tag.label}
									</button>
								) : (
									<span class={C.tagInfo()}>{tag.label}</span>
								)
							}
						</For>
					</div>
				)}
				<button type="button" class={C.testBtn({ active: isTestMode() })} onClick={toggleTestMessages}>
					🧪 {isTestMode() ? "Clear" : "Test"}
				</button>
			</header>

			<main
				ref={setRef}
				class={C.messages()}
				style="scroll-behavior: auto; scroll-padding-top: 64px; scroll-padding-bottom: 96px"
				onScroll={handleScroll}
			>
				<Show when={displayMessages().length === 0} fallback={null}>
					{props.children ?? <div class={C.empty()}>Send a message to start</div>}
				</Show>
				<For each={visibleMessages()}>
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
					class={C.fadeTop()}
					style="mask-image: linear-gradient(to bottom, black 30%, transparent 100%);
 -webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 100%);"
				/>
				<div
					class={C.fadeBottom()}
					style="mask-image: linear-gradient(to top, black 30%, transparent 100%);
 -webkit-mask-image: linear-gradient(to top, black 30%, transparent 100%);"
				/>
			</main>

			<Composer onSend={handleSend} agentConfig={agentConfig()} rainbow={true} />
		</div>
	);
};

export default ChatPanel;
