import { Bot, Copy, RefreshCw, User } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Markdown from "@/components/Markdown/Markdown";

import { cstyle } from "@/utils/cstyle";

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
	/** When set, shows a retry button on user bubbles */
	onRetry?: () => void;
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

// ── Styles ──

const C = {
	chat: cstyle({
		display: "chat",
		variants: { user: { true: "chat-end", false: "chat-start" } },
	}),
	bubbleRow: cstyle({
		display: "flex items-center",
		spacing: "gap-2",
		variants: {
			user: { true: "col-start-1 max-w-[45%]", false: "col-start-2 max-w-[75%]" },
		},
	}),
	retryBtn: cstyle({
		display: "btn btn-circle btn-sm",
		sizing: "shrink-0",
		interaction: "hover:brightness-90",
		color: "text-warning-content bg-warning",
	}),
	bubbleWrapper: cstyle({ sizing: "w-full" }),
	bubble: cstyle({
		display: "chat-bubble max-w-full",
		interaction: "[&::before]:hidden rounded-xl select-text",
		variants: { user: { true: "chat-bubble-primary text-primary-content" } },
	}),
	contentArea: cstyle({ text: "text-base leading-relaxed" }),
	userText: cstyle({
		display: "whitespace-pre-wrap",
		spacing: "m-0",
		interaction: "select-text",
	}),
	streamingCursor: cstyle({
		display: "inline-block",
		sizing: "w-2 h-4",
		spacing: "ml-0.5",
		interaction: "rounded-[1px] animate-pulse align-text-bottom",
	}),
	avatarWrapper: cstyle({ display: "chat-image avatar" }),
	avatarCircle: cstyle({ sizing: "w-10", interaction: "rounded-full" }),
	avatarFallback: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-10 h-10",
		interaction: "rounded-full",
		color: "bg-base-300 text-base-content/60",
	}),
	timeHeader: cstyle({ display: "chat-header" }),
	timeText: cstyle({ text: "text-xs", interaction: "opacity-50" }),
	fileList: cstyle({
		display: "flex flex-col",
		spacing: "gap-2 mb-2 pb-2",
		interaction: "border-b",
		color: "border-white/15",
	}),
	fileItem: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-2 py-1",
		interaction: "rounded transition-colors",
		color: "bg-white/10 hover:bg-white/20",
	}),
	fileIcon: cstyle({ text: "text-lg leading-none", sizing: "shrink-0" }),
	fileContent: cstyle({ display: "flex flex-col", sizing: "min-w-0 flex-1" }),
	fileName: cstyle({ text: "text-sm font-medium truncate" }),
	fileSize: cstyle({ text: "text-[10px]", interaction: "opacity-70" }),
	filePreview: cstyle({
		sizing: "shrink-0 w-10 h-10",
		interaction: "rounded-xs overflow-hidden border",
		color: "border-white/20",
	}),
	filePreviewImg: cstyle({ sizing: "w-full h-full", interaction: "object-cover" }),
	thinkingBlock: cstyle({
		spacing: "mb-2",
		interaction: "rounded-box overflow-hidden border",
		color: "border-base-300",
	}),
	thinkingToggle: cstyle({
		display: "btn btn-ghost btn-xs w-full justify-start",
		spacing: "gap-1",
		color: "text-base-content/60",
	}),
	thinkingArrow: cstyle({ text: "text-[10px] leading-none font-mono", sizing: "shrink-0" }),
	thinkingLabel: cstyle({ text: "text-xs" }),
	thinkingContent: cstyle({
		text: "font-mono text-[10px] whitespace-pre-wrap leading-relaxed",
		spacing: "p-2",
		sizing: "max-h-50 overflow-y-auto",
		interaction: "border-t",
		color: "bg-base-200 text-base-content/50 border-base-300",
	}),
	footer: cstyle({
		display: "chat-footer flex items-center",
		spacing: "gap-2",
		interaction: "opacity-50",
	}),
	copyBtn: cstyle({ display: "btn btn-ghost btn-xs", color: "text-base-content" }),
};

// ── Sub-components ──

interface AvatarSlotProps {
	avatar?: string;
	isUser: boolean;
}

const AvatarSlot: Component<AvatarSlotProps> = (props) => (
	<div class={C.avatarWrapper()}>
		<div class={C.avatarCircle()}>
			<Show
				when={props.avatar}
				fallback={
					<div class={C.avatarFallback()}>{props.isUser ? <User class="w-5 h-5" /> : <Bot class="w-5 h-5" />}</div>
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
		<div class={C.timeHeader()}>
			<time class={C.timeText()}>{props.timestamp}</time>
		</div>
	</Show>
);

interface FileSectionProps {
	files?: FileAttachment[];
}

const FileSection: Component<FileSectionProps> = (props) => (
	<Show when={props.files && props.files.length > 0}>
		<div class={C.fileList()}>
			<For each={props.files}>
				{(file) => (
					<div class={C.fileItem()}>
						<span class={C.fileIcon()}>{fileIcon(file.type)}</span>
						<div class={C.fileContent()}>
							<span class={C.fileName()}>{file.name}</span>
							<Show when={file.size !== undefined}>
								<span class={C.fileSize()}>{formatFileSize(file.size ?? 0)}</span>
							</Show>
						</div>
						<Show when={file.preview}>
							<div class={C.filePreview()}>
								<img src={file.preview} alt={file.name} class={C.filePreviewImg()} />
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
		<div class={C.thinkingBlock()}>
			<button type="button" class={C.thinkingToggle()} onClick={props.onToggle}>
				<span class={C.thinkingArrow()}>{props.open ? "▾" : "▸"}</span>
				<span class={C.thinkingLabel()}>{props.label}</span>
			</button>
			<Show when={props.open}>
				<div class={C.thinkingContent()}>{props.thinking}</div>
			</Show>
		</div>
	</Show>
);

interface BubbleFooterProps {
	timestamp?: string;
	isUser: boolean;
	onCopy?: () => void;
}

const BubbleFooter: Component<BubbleFooterProps> = (props) => (
	<Show when={props.timestamp}>
		<div class={C.footer()}>
			{props.isUser ? "Delivered" : ""}
			<Show when={props.isUser && props.onCopy}>
				<button type="button" class={C.copyBtn()} onClick={props.onCopy} aria-label="Copy message">
					<Copy class="w-3 h-3" />
				</button>
			</Show>
		</div>
	</Show>
);

// ── Main component ──

const ChatBubble: Component<ChatBubbleProps> = (props) => {
	const { t } = useLocale();
	const [thinkingOpen, setThinkingOpen] = createSignal(true);

	const isUser = () => props.role === "user";

	return (
		<div class={C.chat({ user: isUser() })}>
			<AvatarSlot avatar={props.avatar} isUser={isUser()} />
			<TimeHeader timestamp={props.timestamp} />

			{/* Bubble + retry */}
			<div class={C.bubbleRow({ user: isUser() })}>
				<Show when={props.onRetry && isUser()}>
					<button type="button" class={C.retryBtn()} onClick={props.onRetry} aria-label="Retry">
						<RefreshCw class="w-3.5 h-3.5" />
					</button>
				</Show>
				<div class={C.bubbleWrapper()}>
					<div class={C.bubble({ user: isUser() })}>
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

						<div class={C.contentArea()}>
							<Show
								when={!isUser()}
								fallback={
									<p class={C.userText()}>
										{props.content}
										<Show when={props.streaming}>
											<span class={C.streamingCursor()} />
										</Show>
									</p>
								}
							>
								<Markdown content={props.content} streaming={props.streaming} />
								<Show when={props.streaming}>
									<span class={C.streamingCursor()} />
								</Show>
							</Show>
						</div>
					</div>
				</div>
			</div>

			<BubbleFooter
				timestamp={props.timestamp}
				isUser={isUser()}
				onCopy={isUser() ? () => navigator.clipboard.writeText(props.content) : undefined}
			/>
		</div>
	);
};

export default ChatBubble;
