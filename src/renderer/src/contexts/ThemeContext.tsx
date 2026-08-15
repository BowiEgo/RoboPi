import { type Component, createContext, createEffect, createSignal, type JSX, useContext } from "solid-js";

// ============================================================================
// Available themes (must match @plugin daisyUI themes in tailwind.css)
// ============================================================================

export const THEMES = [
	"light",
	"dark",
	"daisy",
	"cupcake",
	"bumblebee",
	"emerald",
	"corporate",
	"synthwave",
	"retro",
	"cyberpunk",
	"valentine",
	"halloween",
	"garden",
	"forest",
	"aqua",
	"lofi",
	"pastel",
	"fantasy",
	"wireframe",
	"black",
	"luxury",
	"dracula",
	"cmyk",
	"autumn",
	"business",
	"acid",
	"lemonade",
	"night",
	"coffee",
	"winter",
	"dim",
	"nord",
	"sunset",
	"caramellatte",
	"abyss",
	"silk",
] as const;

// ============================================================================
// Context
// ============================================================================

/** Light/dark appearance mode. */
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
	theme: () => string;
	setTheme: (id: string) => void;
	isDark: () => boolean;
	toggleDark: () => void;
	setDark: (dark: boolean) => void;
	mode: () => ThemeMode;
	setMode: (mode: ThemeMode) => void;
}

const ThemeCtx = createContext<ThemeContextValue>();

const STORAGE_KEY = "robo-pi-theme";
const MODE_KEY = "robo-pi-theme-mode";
const LIGHT_KEY = "robo-pi-light-theme";
const DARK_KEY = "robo-pi-dark-theme";

// Dark theme list — light's own dark variant + daisyUI built-in dark themes.
const DARK_THEMES = [
	"dark",
	"night",
	"dracula",
	"synthwave",
	"cyberpunk",
	"halloween",
	"forest",
	"black",
	"luxury",
	"coffee",
	"dim",
	"sunset",
	"abyss",
	"business",
];

/** Whether a theme id is a dark theme. */
export function isDarkTheme(id: string): boolean {
	return DARK_THEMES.includes(id);
}

function getInitialTheme(): string {
	const saved = localStorage.getItem(STORAGE_KEY);
	// Ignore themes that no longer exist in THEMES.
	if (saved && (THEMES as readonly string[]).includes(saved)) return saved;
	// No saved preference: follow the OS color scheme so the app isn't stuck
	// on a light theme when the system is dark (and vice versa).
	const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
	return prefersDark ? "dark" : "light";
}

function getInitialMode(): ThemeMode {
	const saved = localStorage.getItem(MODE_KEY);
	return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function getInitialLight(): string {
	const saved = localStorage.getItem(LIGHT_KEY);
	return saved && (THEMES as readonly string[]).includes(saved) ? saved : "light";
}

function getInitialDark(): string {
	const saved = localStorage.getItem(DARK_KEY);
	return saved && (THEMES as readonly string[]).includes(saved) ? saved : "dark";
}

export const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
	const [theme, setThemeSignal] = createSignal(getInitialTheme());
	const [isDark, setIsDark] = createSignal(DARK_THEMES.includes(getInitialTheme()));
	const [mode, setModeSignal] = createSignal<ThemeMode>(getInitialMode());
	// Last light/dark theme the user picked, so toggling mode restores it.
	const [lightTheme, setLightTheme] = createSignal(getInitialLight());
	const [darkTheme, setDarkTheme] = createSignal(getInitialDark());

	const setTheme = (id: string) => {
		setThemeSignal(id);
		setIsDark(DARK_THEMES.includes(id));
		document.documentElement.setAttribute("data-theme", id);
		localStorage.setItem(STORAGE_KEY, id);
		// Remember the last pick per brightness.
		if (DARK_THEMES.includes(id)) {
			localStorage.setItem(DARK_KEY, id);
			setDarkTheme(id);
		} else {
			localStorage.setItem(LIGHT_KEY, id);
			setLightTheme(id);
		}
	};

	const toggleDark = () => {
		setMode(isDark() ? "light" : "dark");
	};

	const setDark = (dark: boolean) => {
		setMode(dark ? "dark" : "light");
	};

	const setMode = (m: ThemeMode) => {
		setModeSignal(m);
		localStorage.setItem(MODE_KEY, m);
		if (m === "system") {
			const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
			setTheme(dark ? darkTheme() : lightTheme());
		} else {
			setTheme(m === "dark" ? darkTheme() : lightTheme());
		}
	};

	// In system mode, follow OS light/dark changes.
	createEffect(() => {
		if (mode() !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => setTheme(mq.matches ? darkTheme() : lightTheme());
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	});

	// Apply theme on mount
	document.documentElement.setAttribute("data-theme", getInitialTheme());

	return (
		<ThemeCtx.Provider value={{ theme, setTheme, isDark, toggleDark, setDark, mode, setMode }}>
			{props.children}
		</ThemeCtx.Provider>
	);
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeCtx);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
