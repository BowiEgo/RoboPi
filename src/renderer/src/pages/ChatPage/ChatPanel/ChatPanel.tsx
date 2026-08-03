import { Plus } from "lucide-solid";
import {
	type Component,
	createEffect,
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
	const [agentConfig, setAgentConfig] = createSignal<AgentConfig>({});
	let dialogRef: HTMLDivElement | undefined;

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
				case AgentMessageType.AgentReady: {
					const ready = msg.payload as {
						model?: string;
						thinkingLevel?: string;
						availableModels?: string[];
					};
					setAgentConfig({
						model: ready.model,
						thinkingLevel: ready.thinkingLevel,
						availableModels: ready.availableModels,
						status: "idle",
					});
					break;
				}

				case AgentMessageType.AgentConfig: {
					const cfg = msg.payload as AgentConfig;
					setAgentConfig((prev) => ({ ...prev, ...cfg }));
					break;
				}

				case AgentMessageType.AgentStatus: {
					const st = msg.payload as {
						status?: string;
						model?: string;
						thinkingLevel?: string;
					};
					setAgentConfig((prev) => ({
						...prev,
						status: st.status,
						model: st.model ?? prev.model,
						thinkingLevel: st.thinkingLevel ?? prev.thinkingLevel,
					}));
					break;
				}

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
					setMessages((prev) =>
						prev.map((m) =>
							m.streaming ? { ...m, content: m.content + delta } : m,
						),
					);
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
			"analyzing user input...\n" +
			"matching response template: markdown demo\n" +
			"generating reply...";

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
			setMessages((prev) =>
				prev.map((m) => (m.id === agentId ? { ...m, thinking } : m)),
			);

			let charIdx = 0;
			const total = fullContent.length;

			const timer = setInterval(() => {
				charIdx += 8;
				const done = charIdx >= total;
				const chunk = fullContent.slice(0, charIdx);

				setMessages((prev) =>
					prev.map((m) =>
						m.id === agentId ? { ...m, content: chunk, streaming: !done } : m,
					),
				);

				if (done) clearInterval(timer);
			}, 16);
		}, 800);
	}

	return (
		<div class="flex flex-col items-center h-full overflow-hidden">
			<header class="flex shrink-0 items-center justify-between w-full gap-4 px-4 py-3 border-b border-base-300 font-medium text-base font-display text-base-content">
				{props.header}
				{props.tags && props.tags.length > 0 && (
					<div class="flex items-center gap-2 ml-auto">
						<For each={props.tags}>
							{(tag) =>
								tag.type === "action" ? (
									<button
										type="button"
										class="btn btn-ghost btn-sm"
										onClick={() => tag.onClick?.(tag.id)}
									>
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
			</header>

			<main
				class="flex-1 w-full flex flex-col gap-1 overflow-y-auto p-4 text-base-content scroll-smooth"
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
					{(msg) => (
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
			</main>

			<Composer onSend={handleSend} agentConfig={agentConfig()} />
		</div>
	);
};

export default ChatPanel;
