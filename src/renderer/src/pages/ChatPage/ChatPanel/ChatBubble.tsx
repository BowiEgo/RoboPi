import { type Component, createMemo, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import styles from "./ChatBubble.module.css";

// ── Types ──────────────────────────────────────────────

export interface FileAttachment {
	name: string;
	size?: number;
	type?: string;
	preview?: string;
}

export interface ChatBubbleProps {
	id?: string;
	role: "user" | "agent";
	content: string;
	files?: FileAttachment[];
	thinking?: string;
	timestamp?: string;
	avatar?: string;
	/** 是否正在流式输出中，显示打字光标 */
	streaming?: boolean;
}

// ── Helpers ────────────────────────────────────────────

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type?: string): string {
	if (!type) return "📄";
	if (type.startsWith("image/")) return "🖼️";
	if (type.startsWith("video/")) return "🎬";
	if (type.startsWith("audio/")) return "🎵";
	if (type.includes("pdf")) return "📑";
	if (type.includes("zip") || type.includes("tar") || type.includes("gzip"))
		return "📦";
	if (type.includes("javascript") || type.includes("typescript")) return "📜";
	if (type.includes("json")) return "📋";
	if (type.includes("html") || type.includes("css")) return "🌐";
	return "📄";
}

// ── Simple Markdown Renderer ───────────────────────────

interface MdToken {
	type:
		| "h1"
		| "h2"
		| "h3"
		| "h4"
		| "p"
		| "code_block"
		| "li"
		| "hr"
		| "blockquote";
	content?: string;
	lang?: string;
	items?: string[];
}

function parseMarkdown(raw: string): MdToken[] {
	const lines = raw.split("\n");
	const tokens: MdToken[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Code block
		if (line.trim().startsWith("```")) {
			const lang = line.trim().slice(3).trim();
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].trim().startsWith("```")) {
				codeLines.push(lines[i]);
				i++;
			}
			tokens.push({
				type: "code_block",
				content: codeLines.join("\n"),
				lang: lang || undefined,
			});
			i++; // skip closing ```
			continue;
		}

		// HR
		if (/^\s*[-*_]{3,}\s*$/.test(line)) {
			tokens.push({ type: "hr" });
			i++;
			continue;
		}

		// Blockquote
		if (line.trim().startsWith("> ")) {
			const quoteLines: string[] = [];
			while (i < lines.length && lines[i].trim().startsWith("> ")) {
				quoteLines.push(lines[i].trim().slice(2));
				i++;
			}
			tokens.push({ type: "blockquote", content: quoteLines.join("\n") });
			continue;
		}

		// Heading
		const hMatch = line.match(/^(#{1,4})\s+(.+)/);
		if (hMatch) {
			const level = hMatch[1].length;
			tokens.push({
				type: `h${level}` as MdToken["type"],
				content: hMatch[2],
			});
			i++;
			continue;
		}

		// Unordered list
		if (/^\s*[-*+]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
				i++;
			}
			tokens.push({ type: "li", items });
			continue;
		}

		// Ordered list
		if (/^\s*\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
				i++;
			}
			tokens.push({ type: "li", items });
			continue;
		}

		// Paragraph (collect consecutive non-empty, non-special lines)
		if (line.trim() !== "") {
			const pLines: string[] = [];
			while (
				i < lines.length &&
				lines[i].trim() !== "" &&
				!lines[i].trim().startsWith("```") &&
				!lines[i].trim().startsWith("> ") &&
				!/^\s*[-*_]{3,}\s*$/.test(lines[i]) &&
				!/^(#{1,4})\s+/.test(lines[i]) &&
				!/^\s*[-*+]\s+/.test(lines[i]) &&
				!/^\s*\d+\.\s+/.test(lines[i])
			) {
				pLines.push(lines[i]);
				i++;
			}
			tokens.push({ type: "p", content: pLines.join("\n") });
			continue;
		}

		i++;
	}

	return tokens;
}

/** Strip markdown syntax to get plain text for screen readers */
function stripMarkdown(text: string): string {
	return text
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[*_`#>]/g, "")
		.trim();
}

/** Render inline markdown: bold, italic, inline code, links, images */
function renderInline(text: string): string {
	const html = text
		// Escape HTML
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		// Images
		.replace(
			/!\[([^\]]*)\]\(([^)]+)\)/g,
			'<img src="$2" alt="$1" class="md-img" />',
		)
		// Links
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener">$1</a>',
		)
		// Bold + italic
		.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
		// Bold
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		// Italic
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		// Inline code
		.replace(/`([^`]+)`/g, "<code>$1</code>");

	return html;
}

// ── Component ──────────────────────────────────────────

const ChatBubble: Component<ChatBubbleProps> = (props) => {
	const { t } = useLocale();
	const [thinkingOpen, setThinkingOpen] = createSignal(true);

	const isUser = () => props.role === "user";

	const parsedContent = createMemo(() => {
		if (isUser()) return null;
		return parseMarkdown(props.content);
	});

	const hasFiles = () => props.files && props.files.length > 0;
	const hasThinking = () => props.thinking && props.thinking.trim().length > 0;

	return (
		<div
			class={styles.bubbleRow}
			classList={{
				[styles.userRow]: isUser(),
				[styles.agentRow]: !isUser(),
			}}
		>
			{/* Avatar */}
			<div class={styles.avatar}>
				<Show
					when={props.avatar}
					fallback={
						<span class={styles.avatarPlaceholder}>
							{isUser() ? "👤" : "🤖"}
						</span>
					}
				>
					<img src={props.avatar!} alt="" class={styles.avatarImg} />
				</Show>
			</div>

			{/* Bubble content */}
			<div
				class={styles.bubble}
				classList={{
					[styles.userBubble]: isUser(),
					[styles.agentBubble]: !isUser(),
					[styles.streamingBubble]: props.streaming,
				}}
			>
				{/* ── File attachments (user only) ── */}
				<Show when={isUser() && hasFiles()}>
					<div class={styles.fileList}>
						<For each={props.files}>
							{(file) => (
								<div class={styles.fileItem}>
									<span class={styles.fileIcon}>{fileIcon(file.type)}</span>
									<div class={styles.fileInfo}>
										<span class={styles.fileName}>{file.name}</span>
										<Show when={file.size !== undefined}>
											<span class={styles.fileSize}>
												{formatFileSize(file.size!)}
											</span>
										</Show>
									</div>
									<Show when={file.preview}>
										<div class={styles.filePreview}>
											<img
												src={file.preview}
												alt={file.name}
												class={styles.filePreviewImg}
											/>
										</div>
									</Show>
								</div>
							)}
						</For>
					</div>
				</Show>

				{/* ── Thinking process (agent only) ── */}
				<Show when={!isUser() && hasThinking()}>
					<div class={styles.thinkingSection}>
						<button
							type="button"
							class={styles.thinkingToggle}
							onClick={() => setThinkingOpen((v) => !v)}
						>
							<span class={styles.thinkingChevron}>
								{thinkingOpen() ? "▾" : "▸"}
							</span>
							<span class={styles.thinkingLabel}>{t("chat.thinking")}</span>
						</button>
						<Show when={thinkingOpen()}>
							<div class={styles.thinkingContent}>{props.thinking}</div>
						</Show>
					</div>
				</Show>

				{/* ── Main content ── */}
				<div class={styles.content}>
					<Show
						when={!isUser()}
						fallback={
							/* User content: plain text with line breaks */
							<p class={styles.userText}>{props.content}</p>
						}
					>
						{/* Agent content: rendered Markdown */}
						<div class={styles.markdown}>
							<For each={parsedContent()}>
								{(token) => {
									switch (token.type) {
										case "h1":
											return (
												<h1
													class={styles.mdH1}
													aria-label={stripMarkdown(token.content!)}
													innerHTML={renderInline(token.content!)}
												/>
											);
										case "h2":
											return (
												<h2
													class={styles.mdH2}
													aria-label={stripMarkdown(token.content!)}
													innerHTML={renderInline(token.content!)}
												/>
											);
										case "h3":
											return (
												<h3
													class={styles.mdH3}
													aria-label={stripMarkdown(token.content!)}
													innerHTML={renderInline(token.content!)}
												/>
											);
										case "h4":
											return (
												<h4
													class={styles.mdH4}
													aria-label={stripMarkdown(token.content!)}
													innerHTML={renderInline(token.content!)}
												/>
											);
										case "p":
											return (
												<p
													class={styles.mdP}
													innerHTML={renderInline(token.content!)}
												/>
											);
										case "code_block":
											return (
												<div class={styles.codeBlock}>
													<Show when={token.lang}>
														<div class={styles.codeLang}>{token.lang}</div>
													</Show>
													<pre class={styles.codePre}>
														<code>{token.content}</code>
													</pre>
												</div>
											);
										case "li":
											return (
												<ul class={styles.mdUl}>
													<For each={token.items}>
														{(item) => (
															<li
																class={styles.mdLi}
																innerHTML={renderInline(item)}
															/>
														)}
													</For>
												</ul>
											);
										case "hr":
											return <hr class={styles.mdHr} />;
										case "blockquote":
											return (
												<blockquote
													class={styles.mdBlockquote}
													innerHTML={renderInline(token.content!)}
												/>
											);
										default:
											return null;
									}
								}}
							</For>
						</div>
					</Show>
				</div>

				{/* ── Timestamp ── */}
				<Show when={props.timestamp}>
					<div class={styles.timestamp}>{props.timestamp}</div>
				</Show>

				{/* ── Streaming cursor ── */}
				<Show when={props.streaming}>
					<span class={styles.streamingCursor} />
				</Show>
			</div>
		</div>
	);
};

export default ChatBubble;
