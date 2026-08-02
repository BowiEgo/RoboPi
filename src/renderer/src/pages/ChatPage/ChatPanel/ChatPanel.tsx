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

import Icon from "@/components/Icon";

import plusIcon from "@/assets/icons/plus.svg?raw";

import styles from "./ChatPanel.module.css";

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
	/** 当前会话 ID */
	sessionId?: string;
	/** 初始消息列表（从会话历史加载） */
	initialMessages?: ChatBubbleProps[];
	/** 切换到新会话时清空消息 */
	resetKey?: string;
	/** 委托父组件处理发送（用于延迟创建会话等场景） */
	onSend?: (text: string) => Promise<unknown> | void;
}

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

	// 会话切换时重新加载消息（仅响应 resetKey，不响应 sessionId）
	// sessionId 变化但 resetKey 不变 = 延迟创建会话场景，保留 ChatPanel 内已有的气泡
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

	// Auto-scroll to bottom when messages change
	createEffect(() => {
		const contentSnap = messages()
			.map((m) => m.content)
			.join("");
		void contentSnap;
		if (dialogRef) {
			requestAnimationFrame(() => {
				dialogRef!.scrollTop = dialogRef!.scrollHeight;
			});
		}
	});

	// ── Subscribe to Agent Host messages ──
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

			if (!msg?.type) return;

			switch (msg.type) {
				case "agent:ready": {
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

				case "agent:config": {
					const cfg = msg.payload as AgentConfig;
					setAgentConfig((prev) => ({ ...prev, ...cfg }));
					break;
				}

				case "agent:status": {
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

				case "thinking:update": {
					const { text } = msg.payload;
					if (!text) return;
					setMessages((prev) =>
						prev.map((m) =>
							m.streaming ? { ...m, thinking: (m.thinking ?? "") + text } : m,
						),
					);
					break;
				}

				case "chat:chunk": {
					const { delta, kind } = msg.payload;
					if (!delta || kind !== "content") return;
					setMessages((prev) =>
						prev.map((m) =>
							m.streaming ? { ...m, content: m.content + delta } : m,
						),
					);
					break;
				}

				case "chat:done": {
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

				case "chat:error": {
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

		// 1. Add user message
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

		// 2. Add empty agent bubble
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

		// 3. Delegate to parent or send directly
		if (props.onSend) {
			props.onSend(text.trim());
		} else {
			const agentIpc = getAgentIpc();
			if (agentIpc) {
				agentIpc.send({
					id: agentId,
					type: "chat:send",
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

	/** Mock streaming reply for when Agent Host is unavailable */
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
		<div class={styles.layout}>
			<header class={styles.header}>
				{props.header}
				{props.tags && props.tags.length > 0 && (
					<div class={styles.tags}>
						<For each={props.tags}>
							{(tag) =>
								tag.type === "action" ? (
									<button
										type="button"
										class={styles.actionBtn}
										onClick={() => tag.onClick?.(tag.id)}
									>
										<span class={styles.actionIcon}>
											<Icon raw={plusIcon} />
										</span>
										{tag.label}
									</button>
								) : (
									<span class={styles.tag}>{tag.label}</span>
								)
							}
						</For>
					</div>
				)}
			</header>

			<main class={styles.dialog} ref={dialogRef}>
				<Show when={messages().length === 0} fallback={null}>
					{props.children ?? (
						<div class={styles.emptyHint}>Send a message to start</div>
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
