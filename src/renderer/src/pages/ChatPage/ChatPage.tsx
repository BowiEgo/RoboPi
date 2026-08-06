import { type Component, createMemo, createSignal, type JSX } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import Resizer from "@/components/Resizer/Resizer";
import Search from "@/components/Search/Search";

import ChatPanel, { type ChatTag } from "./ChatPanel/ChatPanel";
import SessionList from "./SessionList/SessionList";

interface ChatPageProps {
	sidebarHeader?: JSX.Element;
	sidebarBottom?: JSX.Element;
	children?: JSX.Element;
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
}

const ChatPage: Component<ChatPageProps> = (props) => {
	const { t } = useLocale();
	const { activeId, activeName, messages, resetKey, loading, agentConfig, createSession, handleSend } = useAgent();

	const minW = () => props.minWidth ?? 180;
	const maxW = () => props.maxWidth ?? 600;
	const [drawerWidth, setDrawerWidth] = createSignal(props.defaultWidth ?? 300);

	const tags = createMemo<ChatTag[]>(() => [
		{ id: "context", label: "上下文：0.0% / 1.0M ↑ 0 ↓ 0" },
		{ id: "cache", label: "缓存：0" },
		{ id: "cost", label: "$0.000" },
		{
			id: "new",
			label: t("chat.newSession"),
			type: "action",
			onClick: () => createSession(),
		},
	]);

	return (
		<div class="flex h-full overflow-hidden bg-app">
			<div class="relative shrink-0" style={{ width: `${drawerWidth()}px` }}>
				<aside
					class="flex flex-col h-full pt-3 overflow-hidden select-none border-r-glow text-primary/20 dark:text-gray-700"
					aria-label={t("chat.drawerLabel")}
				>
					{props.sidebarHeader && (
						<div class="flex items-center gap-2 px-4 text-[15px] font-medium font-display text-base-content shrink-0">
							{props.sidebarHeader}
						</div>
					)}
					<div class="flex-1 p-3 text-base-content">
						<Search />
						<SessionList />
					</div>
					{props.sidebarBottom && <div class="shrink-0">{props.sidebarBottom}</div>}
				</aside>
				<Resizer
					value={drawerWidth()}
					min={minW()}
					max={maxW()}
					position="right"
					grip={false}
					onChange={(v) => setDrawerWidth(v)}
				/>
			</div>

			<main class="flex-1 flex flex-col overflow-hidden text-base-content ml-2.5" aria-label={t("chat.contentLabel")}>
				<ChatPanel
					header={<span>{loading() ? `${t("status.starting")}...` : activeName() || "RoboPi"}</span>}
					tags={tags()}
					sessionId={activeId() ?? undefined}
					agentConfig={agentConfig()}
					initialMessages={messages()}
					resetKey={resetKey()}
					onSend={handleSend}
				>
					{props.children}
				</ChatPanel>
			</main>
		</div>
	);
};

export default ChatPage;
