import { type Component, createMemo, createSignal, type JSX } from "solid-js";

import { useAgent } from "@/agent/useAgent";
import { useLocale } from "@/contexts/LocaleContext";

import Resizer from "@/components/Resizer/Resizer";
import Search from "@/components/Search/Search";

import ChatPanel, { type ChatTag } from "./ChatPanel/ChatPanel";
import SessionList from "./SessionList/SessionList";
import { cstyle } from "@/utils/cstyle";

// ── Layout ──

const root = cstyle({ base: "flex h-full overflow-hidden" });
const drawer = "relative shrink-0";
const aside = "flex flex-col h-full pt-3 overflow-hidden select-none";
const sidebarHeader = "flex items-center gap-2 px-4 text-[15px] font-medium font-display shrink-0";
const sidebarContent = "flex-1 p-3";
const sidebarBottom = "shrink-0";
const main = cstyle({ base: "flex-1 flex flex-col overflow-hidden p-8 pt-0 pl-5" });

interface ChatPageProps {
	sidebarHeader?: JSX.Element;
	sidebarBottom?: JSX.Element;
	children?: JSX.Element;
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
}

// ── Usage label formatting ──

function formatCompact(n: number): string {
	if (n >= 1_000_000) {
		const v = (n / 1_000_000).toFixed(1);
		return `${v.endsWith(".0") ? v.slice(0, -2) : v}M`;
	}
	if (n >= 1_000) {
		const v = (n / 1_000).toFixed(1);
		return `${v.endsWith(".0") ? v.slice(0, -2) : v}K`;
	}
	return String(Math.round(n));
}

function formatPercent(p: number | null | undefined): string {
	return p == null ? "—" : `${(p * 100).toFixed(1)}%`;
}

const ChatPage: Component<ChatPageProps> = (props) => {
	const { t } = useLocale();
	const { activeId, activeName, messages, resetKey, loading, agentConfig, stats, createSession, handleSend } =
		useAgent();

	const minW = () => props.minWidth ?? 180;
	const maxW = () => props.maxWidth ?? 600;
	const [drawerWidth, setDrawerWidth] = createSignal(props.defaultWidth ?? 300);

	const tags = createMemo<ChatTag[]>(() => {
		const s = stats();
		const tokens = s?.tokens;
		const ctx = s?.contextUsage;
		const contextWindow = ctx ? formatCompact(ctx.contextWindow) : "—";
		const contextLabel = `上下文：${formatPercent(ctx?.percent)} / ${contextWindow} ↑ ${formatCompact(tokens?.input ?? 0)} ↓ ${formatCompact(tokens?.output ?? 0)}`;
		const cacheLabel = `缓存：${formatCompact(tokens?.cacheRead ?? 0)}`;
		const costLabel = `$${(s?.cost ?? 0).toFixed(3)}`;
		return [
			{ id: "context", label: contextLabel },
			{ id: "cache", label: cacheLabel },
			{ id: "cost", label: costLabel },
			{
				id: "new",
				label: t("chat.newSession"),
				type: "action",
				onClick: () => createSession(),
			},
		];
	});

	return (
		<div class={`${root()} bg-app-raised`}>
			<div class={drawer} style={{ width: `${drawerWidth()}px` }}>
				<aside class={`${aside} text-primary/10`} aria-label={t("chat.drawerLabel")}>
					{props.sidebarHeader && <div class={`${sidebarHeader} text-base-content`}>{props.sidebarHeader}</div>}
					<div class={`${sidebarContent} text-base-content`}>
						<Search />
						<SessionList />
					</div>
					{props.sidebarBottom && <div class={sidebarBottom}>{props.sidebarBottom}</div>}
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

			<main class={`${main()} text-base-content`} aria-label={t("chat.contentLabel")}>
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
