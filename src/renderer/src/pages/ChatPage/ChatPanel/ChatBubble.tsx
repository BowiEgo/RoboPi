import { Bot, Copy, RefreshCw, User } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Markdown from "@/components/Markdown/Markdown";

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

// ── Class constants ──

const CHAT_BUBBLE_WRAPPER = "chat-bubble max-w-full [&::before]:hidden rounded-xl select-text";
const CHAT_BUBBLE_PRIMARY = "chat-bubble-primary text-primary-content";
const BUBBLE_OUTER_LAYOUT = "w-full";
const CONTENT_AREA = "text-base leading-relaxed";
const USER_TEXT = "whitespace-pre-wrap m-0 select-text";
const STREAMING_CURSOR = "inline-block w-2 h-4 ml-0.5 rounded-[1px] animate-pulse align-text-bottom";
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
					<div class="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center text-base-content/60">
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
		<div class="flex flex-col gap-2 mb-2 pb-2 border-b border-white/15">
			<For each={props.files}>
				{(file) => (
					<div class="flex items-center gap-2 px-2 py-1 bg-white/10 rounded transition-colors hover:bg-white/20">
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
		<div class="mb-2 rounded-box overflow-hidden border border-base-300">
			<button
				type="button"
				class="btn btn-ghost btn-xs w-full justify-start gap-1 text-base-content/60"
				onClick={props.onToggle}
			>
				<span class="text-[10px] leading-none shrink-0 font-mono">{props.open ? "▾" : "▸"}</span>
				<span class="text-xs">{props.label}</span>
			</button>
			<Show when={props.open}>
				<div class="p-2 font-mono text-[10px] whitespace-pre-wrap leading-relaxed bg-base-200 text-base-content/50 max-h-50 overflow-y-auto border-t border-base-300">
					{props.thinking}
				</div>
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
		<div class="chat-footer opacity-50 flex items-center gap-2">
			{props.isUser ? "Delivered" : ""}
			<Show when={props.isUser && props.onCopy}>
				<button
					type="button"
					class="btn btn-ghost btn-xs text-base-content"
					onClick={props.onCopy}
					aria-label="Copy message"
				>
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
		<div class={`chat ${isUser() ? "chat-end" : "chat-start"}`}>
			<AvatarSlot avatar={props.avatar} isUser={isUser()} />
			<TimeHeader timestamp={props.timestamp} />

			{/* Bubble + retry */}
			<div class={`flex items-center gap-2 ${isUser() ? "col-start-1 max-w-[45%]" : "col-start-2 max-w-[75%]"}`}>
				<Show when={props.onRetry && isUser()}>
					<button
						type="button"
						class="btn btn-circle btn-sm text-warning-content bg-warning hover:brightness-90 shrink-0"
						onClick={props.onRetry}
						aria-label="Retry"
					>
						<RefreshCw class="w-3.5 h-3.5" />
					</button>
				</Show>
				<div class={`${BUBBLE_OUTER_LAYOUT}`}>
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
								<Markdown content={props.content} streaming={props.streaming} />
								<Show when={props.streaming}>
									<span class={STREAMING_CURSOR} />
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
