import {
	type Component,
	createEffect,
	createSignal,
	For,
	type JSX,
	Show,
} from "solid-js";

import Icon from "@/components/Icon";

import plusIcon from "@/assets/icons/plus.svg?raw";

import styles from "./ChatPanel.module.css";

import Composer from "../Composer/Composer";
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

// ── Mock agent response ──

const MOCK_AGENT_CONTENT =
	"收到你的消息了！这是一个 **Markdown** 回复示例：\n\n" +
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

const MOCK_AGENT_THINKING =
	"正在分析用户输入...\n识别意图：通用对话\n" +
	"匹配回复模板：markdown 功能展示\n生成回复中...";

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

	// Auto-scroll to bottom when messages change
	createEffect(() => {
		// Track all content to trigger on streaming updates
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

	function handleSend(text: string) {
		if (!text.trim()) return;

		// 1. Add user message immediately
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

		// 2. After a short delay, start streaming the agent reply
		const agentId = String(++nextId);

		setTimeout(() => {
			// Insert empty agent bubble with thinking visible
			setMessages((prev) => [
				...prev,
				{
					id: agentId,
					role: "agent" as const,
					content: "",
					thinking: MOCK_AGENT_THINKING,
					streaming: true,
					timestamp: now(),
				},
			]);

			// Stream characters into that bubble
			let charIdx = 0;
			const total = MOCK_AGENT_CONTENT.length;

			const timer = setInterval(() => {
				charIdx += 8; // chars per tick
				const done = charIdx >= total;
				const chunk = MOCK_AGENT_CONTENT.slice(0, charIdx);

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

			<Composer onSend={handleSend} />
		</div>
	);
};

export default ChatPanel;
