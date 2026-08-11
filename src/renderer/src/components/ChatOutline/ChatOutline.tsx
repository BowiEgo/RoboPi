import { type Component, createEffect, createMemo, createSignal, For } from "solid-js";

import type { ChatBubbleProps } from "@/pages/ChatPage/ChatPanel/ChatBubble";

import { define } from "@/utils/cx";

// ── Types ──

interface TimelineMark {
	msgId: string;
	userText: string;
}

interface ChatOutlineProps {
	messages: ChatBubbleProps[];
}

// ── Class constants ──

const wrapper = define({ base: "absolute w-12.5 h-60 right-4 top-1/2 -translate-y-1/2 z-10" });

const scrollArea = "absolute right-0 w-60 h-60 overflow-hidden rounded-lg";
const scrollAreaCollapsed = "border-transparent pointer-events-none";
const scrollAreaExpanded = "bg-base-100 border border-base-300/60 shadow-lg blur-mask-t-[32px] blur-mask-b-[32px]";

const list = "absolute right-0 min-w-0.25 max-w-full h-full pr-2 overflow-x-hidden scroll-list";

const listItems = "relative flex flex-col z-0 py-4";

const row =
	"flex items-center pl-4 py-1.5 w-full justify-between text-sm cursor-pointer text-base-content/60 hover:text-base-content";

const titleBase = "leading-tight truncate transition-opacity duration-200";
const titleCollapsed = "opacity-0";
const titleActive = "font-medium";
const titleInactive = "";

const dashBase = "w-3 h-0.75 rounded-full shrink-0 bg-base-content/40";
const dashActive = "bg-primary";

// ── Component ──

const ChatOutline: Component<ChatOutlineProps> = (props) => {
	const [marks, setMarks] = createSignal<TimelineMark[]>([]);
	const [activeId, setActiveId] = createSignal<string | null>(null);
	const [hovered, setHovered] = createSignal(false);

	// ── Extract user messages ──
	createEffect(() => {
		const msgs = props.messages;
		void msgs.length;
		const items: TimelineMark[] = [];
		for (let i = 0; i < msgs.length; i++) {
			const m = msgs[i];
			if (m.role !== "user") continue;
			items.push({ msgId: `msg-${m.id}`, userText: m.content.slice(0, 50) });
		}
		setMarks(items);
	});

	// ── Track active message via IntersectionObserver + visible Set ──

	let listRef: HTMLDivElement | undefined;
	const visibleEls = new Set<Element>();
	let observer: IntersectionObserver | undefined;
	let scrollTimer: ReturnType<typeof setTimeout> | undefined;
	let manualJump = false;

	createEffect(() => {
		const main = getScrollContainer();
		if (!main) return;

		// Observer: maintain Set of visible element IDs
		observer?.disconnect();
		observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) visibleEls.add(e.target);
					else visibleEls.delete(e.target);
				}
				updateActiveId();
			},
			{ root: main, rootMargin: "-48px 0px -20% 0px", threshold: 0 },
		);

		// Scroll fallback + initial trigger
		const onScroll = () => {
			clearTimeout(scrollTimer);
			scrollTimer = setTimeout(updateActiveId, 50);
		};
		main.addEventListener("scroll", onScroll, { passive: true });
		updateActiveId();

		return () => {
			main.removeEventListener("scroll", onScroll);
			observer?.disconnect();
			clearTimeout(scrollTimer);
		};
	});

	function updateActiveId() {
		if (manualJump) return;
		const main = getScrollContainer();
		if (!main) return;

		// Fallback: at the bottom → last user message is active
		const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 48;
		console.log(atBottom);
		if (atBottom) {
			const items = marks();
			if (items.length > 0) setActiveId(items[items.length - 1].msgId);
			return;
		}

		const els = [...visibleEls].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
		for (let i = 0; i < els.length; i++) {
			const el = els[i];
			if (el.getAttribute("data-role") === "user") {
				const nextEl = els[i + 1];
				if (nextEl && nextEl.getAttribute("data-role") === "agent") {
					setActiveId(el.id);
					return;
				}
				return;
			} else {
				const nextEl = els[i + 1];
				if (nextEl && nextEl.getAttribute("data-role") === "user") {
					setActiveId(nextEl.id);
				} else {
					// Agent visible — find preceding user message from marks
					const items = marks();
					for (let j = items.length - 1; j >= 0; j--) {
						const userEl = document.getElementById(items[j].msgId);
						if (userEl && el.compareDocumentPosition(userEl) & Node.DOCUMENT_POSITION_PRECEDING) {
							setActiveId(items[j].msgId);
							return;
						}
					}
				}
			}
		}
	}

	// Memo: bake activeId into marks so <For> re-renders on active change.
	const activeMarks = createMemo(() => marks().map((m) => ({ ...m, isActive: activeId() === m.msgId })));

	// Re-observe when messages change (session switch, new messages)
	createEffect(() => {
		const msgs = props.messages;
		void msgs.length;
		if (!observer) return;
		visibleEls.clear();
		observer.disconnect();
		requestAnimationFrame(() => {
			for (const m of msgs) {
				const el = document.getElementById(`msg-${m.id}`);
				if (el) observer?.observe(el);
			}
		});
	});

	// ── Page-flip outline when active dash leaves viewport ──

	createEffect(() => {
		const id = activeId();
		const listEl = listRef;
		if (!id || !listEl) return;

		const dash = document.getElementById(`dash-${id}`);
		if (!dash) return;

		const listRect = listEl.getBoundingClientRect();
		const dashRect = dash.getBoundingClientRect();
		if (dashRect.bottom < listRect.top + 4 || dashRect.top > listRect.bottom - 4) {
			const center = dash.offsetTop + dash.offsetHeight / 2 - listEl.clientHeight / 2;
			listEl.scrollTo({ top: center, behavior: "smooth" });
		}
	});

	// ── Scroll to ──
	const SCROLL_OFFSET = 80;

	function getScrollContainer(): HTMLElement | null {
		return document.querySelector(".chat-panel main");
	}

	function jumpTo(msgId: string) {
		const el = document.getElementById(msgId);
		const container = getScrollContainer();
		if (!el || !container) return;

		const elTop = el.getBoundingClientRect().top;
		const containerTop = container.getBoundingClientRect().top;
		const target = container.scrollTop + elTop - containerTop - SCROLL_OFFSET;

		container.scrollTo({ top: target, behavior: "auto" });
		manualJump = true;
		setActiveId(msgId);
		setTimeout(() => {
			manualJump = false;
		}, 500);
	}

	// ── Render ──
	return (
		<div class={`${wrapper()}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
			<div class={`${scrollArea} ${hovered() ? scrollAreaExpanded : scrollAreaCollapsed}`}>
				<div
					class={`${list} ${hovered() ? "scrollbar-thumb-base-300" : ""}`}
					ref={(el) => {
						listRef = el;
					}}
				>
					<div class={`${listItems}`}>
						<For each={activeMarks()}>
							{(mark) => (
								<div class={row} onClick={() => jumpTo(mark.msgId)} aria-label={mark.userText}>
									<span
										class={`${titleBase} ${hovered() ? (mark.isActive ? titleActive : titleInactive) : titleCollapsed}`}
									>
										{mark.userText}
									</span>
									<span class={`${dashBase} ${mark.isActive ? dashActive : ""}`} id={`dash-${mark.msgId}`} />
								</div>
							)}
						</For>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatOutline;
