import { Bot, User } from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

// ── Types ──

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
	streaming?: boolean;
}

// ── Helpers ──

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
	if (type.includes("zip") || type.includes("tar") || type.includes("gzip")) return "📦";
	if (type.includes("javascript") || type.includes("typescript")) return "📜";
	if (type.includes("json")) return "📋";
	if (type.includes("html") || type.includes("css")) return "🌐";
	return "📄";
}

// ── Markdown parser ──

interface MdToken {
	type: "h1" | "h2" | "h3" | "h4" | "p" | "code_block" | "li" | "hr" | "blockquote";
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
			i++;
			continue;
		}

		if (/^\s*[-*_]{3,}\s*$/.test(line)) {
			tokens.push({ type: "hr" });
			i++;
			continue;
		}

		if (line.trim().startsWith("> ")) {
			const quoteLines: string[] = [];
			while (i < lines.length && lines[i].trim().startsWith("> ")) {
				quoteLines.push(lines[i].trim().slice(2));
				i++;
			}
			tokens.push({ type: "blockquote", content: quoteLines.join("\n") });
			continue;
		}

		const hMatch = line.match(/^(#{1,4})\s+(.+)/);
		if (hMatch) {
			tokens.push({
				type: `h${hMatch[1].length}` as MdToken["type"],
				content: hMatch[2],
			});
			i++;
			continue;
		}

		if (/^\s*[-*+]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
				i++;
			}
			tokens.push({ type: "li", items });
			continue;
		}

		if (/^\s*\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
				i++;
			}
			tokens.push({ type: "li", items });
			continue;
		}

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

function stripMarkdown(text: string): string {
	return text
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[*_`#>]/g, "")
		.trim();
}

function renderInline(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded" />')
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener" class="text-primary underline underline-offset-2 hover:opacity-80">$1</a>',
		)
		.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
		.replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(
			/`([^`]+)`/g,
			"<code class='bg-base-300 text-primary rounded px-1 py-0.5 font-mono text-[0.9em]'>$1</code>",
		);
}

// ── Class constants ──

const CHAT_BUBBLE_WRAPPER = "chat-bubble max-w-full [&::before]:hidden rounded-xl";
const CHAT_BUBBLE_PRIMARY = "chat-bubble-primary";
const BUBBLE_OUTER_LAYOUT = "max-w-[75%]";
const BUBBLE_AURA = "aura aura-rainbow duration-6000";
const CONTENT_AREA = "text-base leading-relaxed";
const USER_TEXT = "whitespace-pre-wrap m-0";
const STREAMING_CURSOR = "inline-block w-2 h-4 ml-0.5 rounded-[1px] bg-primary animate-pulse align-text-bottom";
const _FILE_LIST = "flex flex-col gap-2 mb-2 pb-2 border-b border-white/20";
const _FILE_ITEM = "flex items-center gap-2 px-2 py-1 bg-white/15 rounded transition-colors hover:bg-white/25";
const _FILE_ICON = "text-lg leading-none shrink-0";
const _FILE_META = "flex flex-col min-w-0 flex-1";
const _FILE_NAME = "text-sm font-medium truncate";
const _FILE_SIZE = "text-[10px] opacity-70";
const _FILE_PREVIEW = "shrink-0 w-10 h-10 rounded-xs overflow-hidden border border-white/20";
const _THINKING_WRAPPER = "mb-2 rounded border border-base-300 overflow-hidden";
const _THINKING_TOGGLE = "btn btn-ghost btn-xs w-full justify-start gap-1";
const _THINKING_CONTENT =
	"p-2 font-mono text-[10px] text-base-content/50 whitespace-pre-wrap leading-relaxed bg-base-200 border-t border-base-300 max-h-[200px] overflow-y-auto";
const _CODE_BLOCK = "rounded border border-base-300 overflow-hidden bg-base-200";
const _CODE_LANG =
	"px-3 py-1 font-mono text-[11px] text-base-content/50 uppercase tracking-wider bg-base-300 border-b border-base-300";
const _CODE_PRE = "m-0 p-3 overflow-x-auto font-mono text-[10px] leading-relaxed text-base-content whitespace-pre";
const _BLOCKQUOTE =
	"m-0 px-3 py-1 border-l-[3px] border-primary bg-base-200 rounded-r-sm italic text-base-content/70 leading-relaxed";

// ── Sub-components ──

interface AvatarSlotProps {
	avatar?: string;
	isUser: boolean;
}

const AvatarSlot: Component<AvatarSlotProps> = (props) => (
	<div class="chat-image avatar">
		<div class="w-10 rounded-full">
			<Show
				when={props.avatar}
				fallback={
					<div class="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center">
						{props.isUser ? <User class="w-5 h-5" /> : <Bot class="w-5 h-5" />}
					</div>
				}
			>
				<img src={props.avatar} alt="" />
			</Show>
		</div>
	</div>
);

interface TimeHeaderProps {
	timestamp?: string;
}

const TimeHeader: Component<TimeHeaderProps> = (props) => (
	<Show when={props.timestamp}>
		<div class="chat-header">
			<time class="text-xs opacity-50">{props.timestamp}</time>
		</div>
	</Show>
);

interface FileSectionProps {
	files?: FileAttachment[];
}

const FileSection: Component<FileSectionProps> = (props) => (
	<Show when={props.files && props.files.length > 0}>
		<div class="flex flex-col gap-2 mb-2 pb-2 border-b border-white/20">
			<For each={props.files}>
				{(file) => (
					<div class="flex items-center gap-2 px-2 py-1 bg-white/15 rounded transition-colors hover:bg-white/25">
						<span class="text-lg leading-none shrink-0">{fileIcon(file.type)}</span>
						<div class="flex flex-col min-w-0 flex-1">
							<span class="text-sm font-medium truncate">{file.name}</span>
							<Show when={file.size !== undefined}>
								<span class="text-[10px] opacity-70">{formatFileSize(file.size ?? 0)}</span>
							</Show>
						</div>
						<Show when={file.preview}>
							<div class="shrink-0 w-10 h-10 rounded-xs overflow-hidden border border-white/20">
								<img src={file.preview} alt={file.name} class="w-full h-full object-cover" />
							</div>
						</Show>
					</div>
				)}
			</For>
		</div>
	</Show>
);

interface ThinkingBlockProps {
	thinking?: string;
	open: boolean;
	onToggle: () => void;
	label: string;
}

const ThinkingBlock: Component<ThinkingBlockProps> = (props) => (
	<Show when={props.thinking && props.thinking.trim().length > 0}>
		<div class="mb-2 rounded border border-base-300 overflow-hidden">
			<button type="button" class="btn btn-ghost btn-xs w-full justify-start gap-1" onClick={props.onToggle}>
				<span class="text-[10px] leading-none shrink-0">{props.open ? "▾" : "▸"}</span>
				<span>{props.label}</span>
			</button>
			<Show when={props.open}>
				<div class="p-2 font-mono text-[10px] text-base-content/50 whitespace-pre-wrap leading-relaxed bg-base-200 border-t border-base-300 max-h-[200px] overflow-y-auto">
					{props.thinking}
				</div>
			</Show>
		</div>
	</Show>
);

interface MarkdownSectionProps {
	content: string;
	tokens: MdToken[];
}

const MarkdownSection: Component<MarkdownSectionProps> = (props) => (
	<div class="flex flex-col gap-2 md-content">
		<For each={props.tokens}>
			{(token) => {
				switch (token.type) {
					case "h1":
						return (
							<h1
								class="text-[28px] font-semibold leading-tight my-2 text-base-content"
								aria-label={stripMarkdown(token.content ?? "")}
								innerHTML={renderInline(token.content ?? "")}
							/>
						);
					case "h2":
						return (
							<h2
								class="text-[22px] font-semibold leading-snug my-2 pb-1 border-b border-base-300 text-base-content"
								aria-label={stripMarkdown(token.content ?? "")}
								innerHTML={renderInline(token.content ?? "")}
							/>
						);
					case "h3":
						return (
							<h3
								class="text-lg font-semibold leading-snug my-1 text-base-content"
								aria-label={stripMarkdown(token.content ?? "")}
								innerHTML={renderInline(token.content ?? "")}
							/>
						);
					case "h4":
						return (
							<h4
								class="text-base font-semibold leading-snug my-1 text-base-content/70"
								aria-label={stripMarkdown(token.content ?? "")}
								innerHTML={renderInline(token.content ?? "")}
							/>
						);
					case "p":
						return <p class="m-0 leading-relaxed" innerHTML={renderInline(token.content ?? "")} />;
					case "code_block":
						return (
							<div class="rounded border border-base-300 overflow-hidden bg-base-200">
								<Show when={token.lang}>
									<div class="px-3 py-1 font-mono text-[11px] text-base-content/50 uppercase tracking-wider bg-base-300 border-b border-base-300">
										{token.lang}
									</div>
								</Show>
								<pre class="m-0 p-3 overflow-x-auto font-mono text-[10px] leading-relaxed text-base-content whitespace-pre">
									<code>{token.content}</code>
								</pre>
							</div>
						);
					case "li":
						return (
							<ul class="m-0 pl-5">
								<For each={token.items}>{(item) => <li class="leading-relaxed" innerHTML={renderInline(item)} />}</For>
							</ul>
						);
					case "hr":
						return <hr class="border-none border-t border-base-300 my-2" />;
					case "blockquote":
						return (
							<blockquote
								class="m-0 px-3 py-1 border-l-[3px] border-primary bg-base-200 rounded-r-sm italic text-base-content/70 leading-relaxed"
								innerHTML={renderInline(token.content ?? "")}
							/>
						);
					default:
						return null;
				}
			}}
		</For>
	</div>
);

interface BubbleFooterProps {
	timestamp?: string;
	isUser: boolean;
}

const BubbleFooter: Component<BubbleFooterProps> = (props) => (
	<Show when={props.timestamp}>
		<div class="chat-footer opacity-50">{props.isUser ? "Delivered" : ""}</div>
	</Show>
);

// ── Main component ──

const ChatBubble: Component<ChatBubbleProps> = (props) => {
	const { t } = useLocale();
	const [thinkingOpen, setThinkingOpen] = createSignal(true);

	const isUser = () => props.role === "user";

	const parsedContent = createMemo(() => {
		if (isUser()) return null;
		return parseMarkdown(props.content);
	});

	return (
		<div class={`chat ${isUser() ? "chat-end" : "chat-start"}`}>
			<AvatarSlot avatar={props.avatar} isUser={isUser()} />
			<TimeHeader timestamp={props.timestamp} />

			{/* Bubble */}
			<div
				class={`${BUBBLE_OUTER_LAYOUT} ${isUser() ? "col-start-1" : "col-start-2"} ${!isUser() && props.streaming ? BUBBLE_AURA : ""}`}
			>
				<div class={`${CHAT_BUBBLE_WRAPPER} ${isUser() ? CHAT_BUBBLE_PRIMARY : ""}`}>
					<Show when={isUser()}>
						<FileSection files={props.files} />
					</Show>

					<Show when={!isUser()}>
						<ThinkingBlock
							thinking={props.thinking}
							open={thinkingOpen()}
							onToggle={() => setThinkingOpen((v) => !v)}
							label={t("chat.thinking")}
						/>
					</Show>

					<div class={CONTENT_AREA}>
						<Show
							when={!isUser()}
							fallback={
								<p class={USER_TEXT}>
									{props.content}
									<Show when={props.streaming}>
										<span class={STREAMING_CURSOR} />
									</Show>
								</p>
							}
						>
							<Show
								when={props.streaming}
								fallback={<MarkdownSection content={props.content} tokens={parsedContent() ?? []} />}
							>
								<p class={USER_TEXT}>
									{props.content}
									<span class={STREAMING_CURSOR} />
								</p>
							</Show>
						</Show>
					</div>
				</div>
			</div>

			<BubbleFooter timestamp={props.timestamp} isUser={isUser()} />
		</div>
	);
};

export default ChatBubble;
