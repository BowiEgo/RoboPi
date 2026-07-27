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
		class: "theme-together",
	},
	{
		id: "opencode",
		name: "OpenCode",
		desc: "Cream canvas, monospaced, terminal-inspired",
		class: "theme-opencode",
	},
];

type Mode = "dark" | "light";

interface ThemeContextValue {
	current: () => Theme;
	setTheme: (id: string) => void;
	mode: () => Mode;
	toggleMode: () => void;
	setMode: (m: Mode) => void;
}

const ThemeCtx = createContext<ThemeContextValue>();

const MODE_KEY = "robo-pi-mode";

function getInitialMode(): Mode {
	const saved = localStorage.getItem(MODE_KEY);
	if (saved === "dark" || saved === "light") return saved;
	return "dark";
}

export const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
	const saved = localStorage.getItem("robo-pi-theme") ?? "together-ai";
	const [id, setId] = createSignal(saved);
	const [mode, setMode] = createSignal<Mode>(getInitialMode());

	const current = () => THEMES.find((t) => t.id === id()) ?? THEMES[0];

	const toggleMode = () => {
		setMode((prev) => (prev === "dark" ? "light" : "dark"));
	};

	// Sync theme class to <html>
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

	// Sync mode class to <html>
	createEffect(() => {
		const root = document.documentElement;
		root.classList.remove("mode-dark", "mode-light");
		root.classList.add(mode() === "dark" ? "mode-dark" : "mode-light");
		localStorage.setItem(MODE_KEY, mode());
	});

	return (
		<ThemeCtx.Provider
			value={{ current, setTheme: setId, mode, toggleMode, setMode }}
		>
			{props.children}
		</ThemeCtx.Provider>
	);
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeCtx);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
