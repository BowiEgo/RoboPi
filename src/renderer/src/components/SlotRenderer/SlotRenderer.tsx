/**
 * SlotRenderer — renders every UI extension targeting a given slot.
 *
 * Drop `<SlotRenderer slot="chat:status" />` at any insertion point; the
 * extensions come from the merged store (local + remote) and each view is
 * resolved against the built-in registry. Views own their layout.
 */

import type { UISlot } from "@shared/ui-types";
import { type Component, For } from "solid-js";

import { uiExtensions } from "@/ui-extensions";
import { resolveView } from "@/ui-views";

const SlotRenderer: Component<{ slot: UISlot }> = (props) => {
	const extensions = () => uiExtensions().filter((e) => e.slots.includes(props.slot));

	return (
		<For each={extensions()}>
			{(ext) => {
				const View = resolveView(ext.view);
				return View ? <View /> : null;
			}}
		</For>
	);
};

export default SlotRenderer;
