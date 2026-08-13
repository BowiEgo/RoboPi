import { X } from "lucide-solid";
import { type Component, type JSX, onCleanup, onMount, Show } from "solid-js";

import { cstyle } from "@/utils/cstyle";

export interface ModalProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	/** Max width of the panel. Accepts any CSS width value (default "32rem"). */
	width?: string;
	children: JSX.Element;
}

// ── Styles ──

const C = {
	overlay: cstyle({
		display: "fixed inset-0 z-50 flex items-center justify-center",
		spacing: "p-4",
		color: "bg-black/40",
	}),
	panel: cstyle({
		display: "flex flex-col",
		sizing: "w-full max-h-[85vh] overflow-hidden",
		interaction: "rounded-2xl shadow-2xl border",
		color: "bg-base-100 border-base-300",
	}),
	header: cstyle({
		display: "flex items-center justify-between",
		spacing: "px-6 py-4",
		interaction: "border-b",
		color: "border-base-200",
	}),
	title: cstyle({ text: "text-lg font-semibold", color: "text-base-content" }),
	closeBtn: cstyle({
		display: "btn btn-ghost btn-sm btn-square",
		color: "text-base-content/50 hover:text-base-content",
	}),
	body: cstyle({
		display: "flex flex-col",
		spacing: "p-6 gap-4",
		sizing: "overflow-y-auto",
	}),
};

/**
 * Modal dialog with click-outside close and Escape-to-close.
 * Renders nothing while `open` is false.
 */
const Modal: Component<ModalProps> = (props) => {
	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") props.onClose();
	}

	onMount(() => {
		document.addEventListener("keydown", onKeyDown);
	});
	onCleanup(() => {
		document.removeEventListener("keydown", onKeyDown);
	});

	return (
		<Show when={props.open}>
			<div class={C.overlay()} onClick={props.onClose}>
				<div
					class={C.panel()}
					style={{ "max-width": props.width ?? "32rem" }}
					onClick={(e) => e.stopPropagation()}
					role="dialog"
					aria-modal="true"
				>
					<Show when={props.title}>
						<div class={C.header()}>
							<h3 class={C.title()}>{props.title}</h3>
							<button type="button" class={C.closeBtn()} onClick={props.onClose} aria-label="Close">
								<X class="w-4 h-4" />
							</button>
						</div>
					</Show>
					<div class={C.body()}>{props.children}</div>
				</div>
			</div>
		</Show>
	);
};

export default Modal;
