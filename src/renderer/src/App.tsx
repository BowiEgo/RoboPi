import type { Component } from "solid-js";
import electronLogo from "./assets/electron.svg";
import Versions from "./components/Versions";

const App: Component = () => {
	const ipcHandle = (): void => window.electron.ipcRenderer.send("ping");

	return (
		<>
			<div class="app">
				<img alt="logo" class="logo" src={electronLogo} />
				<div class="creator">Powered by electron-vite</div>
				<div class="text">
					Build an Electron app with <span class="solid">Solid</span>
					&nbsp;and <span class="ts">TypeScript</span>
				</div>
				<p class="tip">
					Please try pressing <code>F12</code> to open the devTool
				</p>
				<div class="actions">
					<div class="action">
						<a
							href="https://electron-vite.org/"
							target="_blank"
							rel="noreferrer"
							class="inline-block cursor-pointer rounded-full border border-transparent px-5 py-2 text-sm font-semibold leading-[38px] no-underline transition-colors duration-300"
						>
							Documentation
						</a>
					</div>
					<div class="action">
						<a
							target="_blank"
							rel="noreferrer"
							onClick={ipcHandle}
							class="inline-block cursor-pointer rounded-full border border-transparent px-5 py-2 text-sm font-semibold leading-[38px] no-underline transition-colors duration-300"
						>
							Send IPC
						</a>
					</div>
				</div>
			</div>
			<Versions />
		</>
	);
};

export default App;
