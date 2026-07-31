import {
	type Component,
	createEffect,
	createSignal,
	For,
	onCleanup,
	type JSX,
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
}

// ── Agent IPC helpers ──

interface AgentIpc {
	send: (msg: unknown) => void;
	onMessage: (cb: (msg: unknown) => void) => () => void;
}

function getAgentIpc(): AgentIpc | null {
	try {
		const w = window as Window & { agent?: AgentIpc };
		const a = w.agent;
		if (a) {
			return a;
		}
	} catch {
		// not available in test/dev without Electron
	}
	return null;
}

function now(): string {
	return new Date().toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

let nextId = 0;

const ChatPanel: Component<ChatPanelProps> = (props) => {
	const [messages, setMessages] = createSignal<ChatBubbleProps[]>([]);
	const [sessionId] = createSignal(`session-${Date.now()}`);
	const [agentConfig, setAgentConfig] = createSignal<AgentConfig>({});
	let dialogRef: HTMLDivElement | undefined;

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
	const agent = getAgentIpc();
	if (agent) {
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
					const st = msg.payload as { status?: string; model?: string; thinkingLevel?: string };
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
							m.streaming
								? { ...m, thinking: (m.thinking ?? "") + text }
								: m,
						),
					);
					break;
				}

				case "chat:chunk": {
					const { delta, kind } = msg.payload;
					if (!delta || kind !== "content") return;
					setMessages((prev) =>
						prev.map((m) =>
							m.streaming
								? { ...m, content: m.content + delta }
								: m,
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
										content: m.content || `❌ 错误: ${errMsg ?? "未知错误"}`,
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
	}

	function handleSend(text: string) {
		if (!text.trim()) return;

		const sid = sessionId();

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

		// 3. Send to Agent Host or use mock fallback
		const agentIpc = getAgentIpc();
		if (agentIpc) {
			agentIpc.send({
				id: agentId,
				type: "chat:send",
				payload: {
					content: text.trim(),
					sessionId: sid,
				},
			});
		} else {
			// Mock fallback when Agent Host is not available
			mockStreamReply(agentId);
		}
	}

	/** Mock streaming reply for when Agent Host is unavailable */
	function mockStreamReply(agentId: string) {
		const thinking =
			"正在分析用户输入...\n识别意图：通用对话\n" +
			"匹配回复模板：markdown 功能展示\n生成回复中...";

		const fullContent =
			"收到你的消息！这是一个 **Markdown** 回复示例：\n\n" +
			"## 功能概览\n\n" +
			"- ✅ 支持 **粗体** 和 *斜体*\n" +
			"- ✅ 代码高亮 `inline code`\n" +
			"- ✅ 代码块\n\n" +
			"```typescript\n" +
			"const greet = (name: string): string => {\n" +
			"  return `Hello, ${name}!`;\n" +
			"};\n" +
			"```\n\n" +
			"> 这是一个引用块，用于展示提示信息。\n\n" +
			"有什么我可以帮你的吗？";

		setTimeout(() => {
			setMessages((prev) =>
				prev.map((m) =>
					m.id === agentId ? { ...m, thinking } : m,
				),
			);

			let charIdx = 0;
			const total = fullContent.length;

			const timer = setInterval(() => {
				charIdx += 8;
				const done = charIdx >= total;
				const chunk = fullContent.slice(0, charIdx);

				setMessages((prev) =>
					prev.map((m) =>
						m.id === agentId
							? { ...m, content: chunk, streaming: !done }
							: m,
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
						<div class={styles.emptyHint}>发送一条消息开始对话</div>
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
