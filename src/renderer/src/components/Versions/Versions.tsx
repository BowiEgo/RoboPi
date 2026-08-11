import { type Component, createSignal } from "solid-js";

const Versions: Component = () => {
	const [versions] = createSignal(window.electron.process.versions);

	return (
		<ul class="flex flex-col gap-1 text-xs text-base-content/30 font-mono">
			<li>Electron v{versions().electron}</li>
			<li>Chromium v{versions().chrome}</li>
			<li>Node v{versions().node}</li>
		</ul>
	);
};

export default Versions;
