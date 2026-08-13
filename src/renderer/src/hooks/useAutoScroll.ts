/**
 * Auto-scroll behavior for the chat message list.
 *
 * - Jumps to the last user message when a new message (or session) arrives.
 * - Smoothly scrolls to the bottom while the agent streams, unless the user
 *   has scrolled away from the bottom.
 *
 * Returns a ref setter and a scroll handler to attach to the scroll container.
 */

import { createEffect, createSignal } from "solid-js";

import type { ChatBubbleProps } from "@/pages/ChatPage/ChatPanel/ChatBubble";

export function useAutoScroll(messages: () => ChatBubbleProps[]) {
	let scrollEl: HTMLElement | undefined;
	let suppressScrollEvent = false;

	const [isNearBottom, setIsNearBottom] = createSignal(true);

	const onScroll = () => {
		if (suppressScrollEvent || !scrollEl) return;
		const el = scrollEl;
		setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= 4);
	};

	const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
		if (!scrollEl) return;
		suppressScrollEvent = true;
		scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior });
		// Re-enable after two animation frames so the smooth scroll settles.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				suppressScrollEvent = false;
				setIsNearBottom(true);
			});
		});
	};

	// Instant jump to the last user message on new message / session switch.
	// If the new session is streaming, follow with an instant scroll to bottom.
	let lastMsgId = "";
	createEffect(() => {
		const msgs = messages();
		if (msgs.length === 0) return;
		const latestId = msgs[msgs.length - 1].id ?? "";
		if (latestId !== lastMsgId) {
			lastMsgId = latestId;
			const streaming = msgs[msgs.length - 1].streaming;
			queueMicrotask(() => {
				const userBubbles = document.querySelectorAll('[data-role="user"]');
				const lastUser = userBubbles[userBubbles.length - 1];
				lastUser?.scrollIntoView({ block: "start" });
				if (streaming && scrollEl) {
					scrollEl.scrollTop = scrollEl.scrollHeight;
				}
			});
		}
	});

	// Smooth scroll to bottom while streaming, only when the user is near bottom.
	createEffect(() => {
		const msgs = messages();
		if (msgs.length === 0) return;
		const last = msgs[msgs.length - 1];
		void last.content.length;
		if (!last.streaming || !isNearBottom()) return;
		scrollToBottom("smooth");
	});

	return {
		setScrollEl: (el: HTMLElement) => {
			scrollEl = el;
		},
		onScroll,
	};
}
