import { type Component, createSignal } from "solid-js";

import { cstyle } from "@/utils/cstyle";

const C = {
	list: cstyle({
		display: "flex flex-col",
		spacing: "gap-1",
		text: "text-xs font-mono",
		color: "text-base-content/30",
	}),
};

const Versions: Component = () => {
	// Browser build has no Electron runtime info — omit the list.
	if (!window.electron) return null;

	const [versions] = createSignal(window.electron.process.versions);

	return (
		<ul class={C.list()}>
			<li>Electron v{versions().electron}</li>
			<li>Chromium v{versions().chrome}</li>
			<li>Node v{versions().node}</li>
		</ul>
	);
};

export default Versions;
