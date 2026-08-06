import { Plus } from "lucide-solid";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	onCleanup,
	onMount,
	Show,
} from "solid-js";

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

import { AgentMessageType, isValidMessageType } from "@shared/agent-types";

import { getAgentIpc } from "@/agent/ipc";

function now(): string {
	return new Date().toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

let nextId = 0;

const ChatPanel: Component<ChatPanelProps> = (props) => {
	const [messages, setMessages] = createSignal<ChatBubbleProps[]>([]);
	let dialogRef: HTMLDivElement | undefined;

	const agentConfig = () => props.agentConfig ?? {};

	let prevKey: string | undefined;
	createEffect(() => {
		const key = props.resetKey;
		if (key && key !== prevKey) {
			prevKey = key;
			if (props.initialMessages?.length) {
				setMessages([...props.initialMessages]);
			} else {
				setMessages([]);
			}
		}
	});

	createEffect(() => {
		const contentSnap = messages()
			.map((m) => m.content)
			.join("");
		void contentSnap;
		if (dialogRef) {
			const el = dialogRef;
			requestAnimationFrame(() => {
				el.scrollTop = el.scrollHeight;
			});
		}
	});

	onMount(() => {
		const agent = getAgentIpc();
		if (!agent) return;

		const unsub = agent.onMessage((raw) => {
			const msg = raw as {
				type: string;
				payload: {
					sessionId?: string;
					delta?: string;
					kind?: string;
					text?: string;
					content?: string;
					thinking?: string;
					message?: string;
				};
			};

			if (!msg?.type || !isValidMessageType(msg.type)) return;

			switch (msg.type) {
				case AgentMessageType.ThinkingUpdate: {
					const { text } = msg.payload;
					if (!text) return;
					setMessages((prev) =>
						prev.map((m) =>
							m.streaming
								? {
										...m,
										thinking: (m.thinking ?? "") + text,
									}
								: m,
						),
					);
					break;
				}

				case AgentMessageType.ChatChunk: {
					const { delta, kind } = msg.payload;
					if (!delta || kind !== "content") return;
					setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, content: m.content + delta } : m)));
					break;
				}

				case AgentMessageType.ChatDone: {
					const { content, thinking } = msg.payload;
					setMessages((prev) =>
						prev.map((m) =>
							m.streaming
								? {
										...m,
										content: content ?? m.content,
										thinking: thinking ?? m.thinking,
										streaming: false,
									}
								: m,
						),
					);
					break;
				}

				case AgentMessageType.ChatError: {
					const { message: errMsg } = msg.payload;
					setMessages((prev) =>
						prev.map((m) =>
							m.streaming
								? {
										...m,
										content: m.content || `❌ Error: ${errMsg ?? "unknown"}`,
										streaming: false,
									}
								: m,
						),
					);
					break;
				}
			}
		});

		onCleanup(unsub);
	});

	// ── Test data (shows when session is empty) ──
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
	let savedMessages: ChatBubbleProps[] = [];

	function toggleTestMessages() {
		if (isTestMode()) {
			setIsTestMode(false);
			setMessages([...savedMessages]);
		} else {
			savedMessages = [...messages()];
			setIsTestMode(true);
			setMessages([...TEST_MESSAGES]);
		}
	}

	const hasStreaming = createMemo(() => messages().some((m) => m.role === "agent" && m.streaming));

	function handleSend(text: string) {
		if (!text.trim()) return;

		const userId = String(++nextId);
		setMessages((prev) => [
			...prev,
			{
				id: userId,
				role: "user" as const,
				content: text.trim(),
				timestamp: now(),
			},
		]);

		const agentId = String(++nextId);
		setMessages((prev) => [
			...prev,
			{
				id: agentId,
				role: "agent" as const,
				content: "",
				thinking: "",
				streaming: true,
				timestamp: now(),
			},
		]);

		if (props.onSend) {
			props.onSend(text.trim());
		} else {
			const agentIpc = getAgentIpc();
			if (agentIpc) {
				agentIpc.send({
					id: agentId,
					type: AgentMessageType.ChatSend,
					payload: {
						content: text.trim(),
						sessionId: props.sessionId ?? "",
					},
				});
			} else {
				mockStreamReply(agentId);
			}
		}
	}

	function mockStreamReply(agentId: string) {
		const thinking =
			"analyzing user input...\n" + "matching response template: markdown demo\n" + "generating reply...";

		const fullContent =
			"Got your message! Here is a **Markdown** reply example:\n\n" +
			"## Features\n\n" +
			"- ✅ Supports **bold** and *italic*\n" +
			"- ✅ Code highlight `inline code`\n" +
			"- ✅ Code blocks\n\n" +
			"```typescript\n" +
			"const greet = (name: string): string => {\n" +
			"  return `Hello, ${name}!`;\n" +
			"};\n" +
			"```\n\n" +
			"> This is a blockquote for tips.\n\n" +
			"How can I help you?";

		setTimeout(() => {
			setMessages((prev) => prev.map((m) => (m.id === agentId ? { ...m, thinking } : m)));

			let charIdx = 0;
			const total = fullContent.length;

			const timer = setInterval(() => {
				charIdx += 8;
				const done = charIdx >= total;
				const chunk = fullContent.slice(0, charIdx);

				setMessages((prev) => prev.map((m) => (m.id === agentId ? { ...m, content: chunk, streaming: !done } : m)));

				if (done) clearInterval(timer);
			}, 16);
		}, 800);
	}

	return (
		<div class="relative flex flex-col items-center h-full overflow-hidden">
			<header class="flex shrink-0 items-center justify-between w-full gap-4 px-4 py-3  dark:border-gray-700 font-medium text-base font-display text-base-content">
				{props.header}
				{props.tags && props.tags.length > 0 && (
					<div class="flex items-center gap-2 ml-auto">
						<For each={props.tags}>
							{(tag) =>
								tag.type === "action" ? (
									<button type="button" class="btn btn-ghost btn-sm" onClick={() => tag.onClick?.(tag.id)}>
										<Plus class="w-3 h-3" />
										{tag.label}
									</button>
								) : (
									<span class="inline-flex items-center px-2.5 py-0.75 border border-base-300 rounded bg-base-200 text-base-content/50 font-mono text-[11px] leading-snug whitespace-nowrap">
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
				class="flex-1 w-full flex flex-col gap-1 overflow-y-auto px-4 pb-[20%] text-base-content scroll-smooth"
				ref={dialogRef}
			>
				<Show when={messages().length === 0} fallback={null}>
					{props.children ?? (
						<div class="flex items-center justify-center flex-1 text-base-content/30 text-sm">
							Send a message to start
						</div>
					)}
				</Show>
				<For each={messages()}>
					{(msg, _index) => (
						<ChatBubble
							id={msg.id}
							role={msg.role}
							content={msg.content}
							files={msg.files}
							thinking={msg.thinking}
							timestamp={msg.timestamp}
							avatar={msg.avatar}
							streaming={msg.streaming}
						/>
					)}
				</For>
				<div
					class="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 backdrop-blur-md
 bg-gradient-to-b from-transparent to-white/60 dark:to-gray-900/60"
					style="mask-image: linear-gradient(to top, black 30%, transparent 100%);
 -webkit-mask-image: linear-gradient(to top, black 30%, transparent 100%);"
				/>
			</main>

			<Composer onSend={handleSend} agentConfig={agentConfig()} rainbow={hasStreaming()} />
		</div>
	);
};

export default ChatPanel;
