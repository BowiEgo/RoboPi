import { Bot, User } from "lucide-solid";
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

const CHAT_BUBBLE_WRAPPER = "chat-bubble max-w-full [&::before]:hidden rounded-xl dark:bg-gray-600";
const CHAT_BUBBLE_PRIMARY = "chat-bubble-primary";
const BUBBLE_OUTER_LAYOUT = "max-w-[75%]";
const CONTENT_AREA = "text-base leading-relaxed";
const USER_TEXT = "whitespace-pre-wrap m-0 text-white/90 dark:text-gray-300";
const STREAMING_CURSOR = "inline-block w-2 h-4 ml-0.5 rounded-[1px] bg-primary animate-pulse align-text-bottom";
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
		<div class="mb-2 rounded overflow-hidden">
			<button
				type="button"
				class="btn btn-ghost btn-xs rounded-b w-full justify-start gap-1 dark:text-neutral-300 dark:hover:bg-black/20 dark:hover:border-gray-500"
				onClick={props.onToggle}
			>
				<span class="text-[10px] leading-none shrink-0">{props.open ? "▾" : "▸"}</span>
				<span>{props.label}</span>
			</button>
			<Show when={props.open}>
				<div class="p-2 font-mono rounded-b text-[10px] text-base-content/50 whitespace-pre-wrap leading-relaxed bg-base-200 max-h-50 overflow-y-auto dark:bg-gray-500 dark:text-gray-300">
					{props.thinking}
				</div>
			</Show>
		</div>
	</Show>
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

	return (
		<div class={`chat ${isUser() ? "chat-end" : "chat-start"}`}>
			<AvatarSlot avatar={props.avatar} isUser={isUser()} />
			<TimeHeader timestamp={props.timestamp} />

			{/* Bubble */}
			<div class={`${BUBBLE_OUTER_LAYOUT} ${isUser() ? "col-start-1" : "col-start-2"} ${!isUser()}`}>
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

			<BubbleFooter timestamp={props.timestamp} isUser={isUser()} />
		</div>
	);
};

export default ChatBubble;
