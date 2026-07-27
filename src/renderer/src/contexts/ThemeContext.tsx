import {
	type Component,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	useContext,
} from "solid-js";

export interface Theme {
	id: string;
	name: string;
	desc: string;
	class: string;
}

export const THEMES: Theme[] = [
	{
		id: "together-ai",
		name: "Together AI",
		desc: "Dark surfaces, periwinkle accent, Inter display sans",
		class: "",
	},
	{
		id: "opencode",
		name: "OpenCode",
		desc: "Cream canvas, monospaced, terminal-inspired",
		class: "theme-opencode",
	},
];

interface ThemeContextValue {
	current: () => Theme;
	setTheme: (id: string) => void;
}

const ThemeCtx = createContext<ThemeContextValue>();

export const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
	const saved = localStorage.getItem("robo-pi-theme") ?? "together-ai";
	const [id, setId] = createSignal(saved);

	const current = () => THEMES.find((t) => t.id === id()) ?? THEMES[0];

	createEffect(() => {
		const cls = current().class;
		const root = document.documentElement;
		// 移除非空的旧主题 class
		for (const t of THEMES) {
			if (t.class) root.classList.remove(t.class);
		}
		if (cls) root.classList.add(cls);
		localStorage.setItem("robo-pi-theme", id());
	});

	return (
		<ThemeCtx.Provider value={{ current, setTheme: setId }}>
			{props.children}
		</ThemeCtx.Provider>
	);
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeCtx);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
