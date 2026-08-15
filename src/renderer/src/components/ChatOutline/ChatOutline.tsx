import { type Component, createEffect, createMemo, createSignal, For } from "solid-js";

import type { ChatBubbleProps } from "@/pages/ChatPage/ChatPanel/ChatBubble";

import { cstyle } from "@/utils/cstyle";

// ── Types ──

interface TimelineMark {
	msgId: string;
	userText: string;
}

interface ChatOutlineProps {
	messages: ChatBubbleProps[];
	/** Full-session outline (id + short text) — shown even before messages load. */
	outline?: Array<{ id: string; text: string }>;
	/** Called when a mark is clicked; may scroll asynchronously (e.g. after mounting the target). */
	onJump?: (msgId: string) => void;
}

// ── Styles ──

const C = {
	wrapper: cstyle({
		display: "absolute right-4 top-1/2 -translate-y-1/2 z-10",
		sizing: "w-12.5 h-fit",
	}),
	scrollArea: cstyle({
		display: "-translate-x-[calc(100%-3.125rem)]",
		sizing: "w-60 max-h-60",
		interaction: "rounded-lg overflow-hidden transition-all duration-200 blur-mask-t-[32px] blur-mask-b-[32px]",
		variants: {
			hovered: {
				true: "bg-base-100 border border-base-300/60 shadow-lg",
				false: "border border-transparent pointer-events-none [--blur-mask-opacity:0]",
			},
		},
	}),
	list: cstyle({
		sizing: "min-w-0.25 max-w-full max-h-60 overflow-y-auto overflow-x-hidden",
		spacing: "pr-2",
		interaction: "scroll-list",
		variants: {
			hovered: { true: "scrollbar-thumb-base-300" },
		},
	}),
	listItems: cstyle({
		display: "relative flex flex-col z-0",
		spacing: "py-4",
	}),
	row: cstyle({
		display: "flex items-center justify-between",
		spacing: "pl-4 py-1.5",
		sizing: "w-full",
		text: "text-sm",
		interaction: "cursor-pointer transition-colors duration-200",
		color: "text-base-content/60 hover:text-base-content",
	}),
	title: cstyle({
		text: "truncate transition-all duration-200",
		variants: {
			active: { true: "font-bold text-primary" },
			collapsed: { true: "opacity-0" },
		},
	}),
	dash: cstyle({
		sizing: "w-2.5 h-0.75",
		interaction: "rounded-full shrink-0 transition-all duration-200",
		color: "bg-base-content/40",
		variants: {
			active: { true: "bg-primary scale-x-120" },
		},
	}),
};

// ── Component ──

const ChatOutline: Component<ChatOutlineProps> = (props) => {
	const [marks, setMarks] = createSignal<TimelineMark[]>([]);
	const [activeId, setActiveId] = createSignal<string | null>(null);
	const [hovered, setHovered] = createSignal(false);

	createEffect(() => {
		const outline = props.outline;
		if (outline && outline.length > 0) {
			const items: TimelineMark[] = outline.map((o) => ({
				msgId: `msg-${o.id}`,
				userText: o.text,
			}));
			setMarks(items);
			return;
		}
		// Fallback: derive from the loaded messages.
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

	let listRef: HTMLDivElement | undefined;
	const visibleEls = new Set<Element>();
	let observer: IntersectionObserver | undefined;
	let scrollTimer: ReturnType<typeof setTimeout> | undefined;
	let manualJump = false;

	createEffect(() => {
		const main = getScrollContainer();
		if (!main) return;

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

		const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 48;
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

	const activeMarks = createMemo(() => marks().map((m) => ({ ...m, isActive: activeId() === m.msgId })));

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

	const SCROLL_OFFSET = 80;

	function getScrollContainer(): HTMLElement | null {
		return document.querySelector(".chat-panel main");
	}

	function jumpTo(msgId: string) {
		manualJump = true;
		setActiveId(msgId);
		if (props.onJump) {
			props.onJump(msgId);
		} else {
			const el = document.getElementById(msgId);
			const container = getScrollContainer();
			if (el && container) {
				const elTop = el.getBoundingClientRect().top;
				const containerTop = container.getBoundingClientRect().top;
				const target = container.scrollTop + elTop - containerTop - SCROLL_OFFSET;
				container.scrollTo({ top: target, behavior: "auto" });
			}
		}
		setTimeout(() => {
			manualJump = false;
		}, 500);
	}

	return (
		<div class={C.wrapper()} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
			<div class={C.scrollArea({ hovered: hovered() })}>
				<div
					class={C.list({ hovered: hovered() })}
					ref={(el) => {
						listRef = el;
					}}
				>
					<div class={C.listItems()}>
						<For each={activeMarks()}>
							{(mark) => (
								<div class={C.row()} onClick={() => jumpTo(mark.msgId)} aria-label={mark.userText}>
									<span class={C.title({ active: hovered() && mark.isActive, collapsed: !hovered() })}>
										{mark.userText}
									</span>
									<span class={C.dash({ active: mark.isActive })} id={`dash-${mark.msgId}`} />
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
