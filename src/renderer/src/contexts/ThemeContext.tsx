import { type Component, createContext, createSignal, type JSX, useContext } from "solid-js";

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

interface ThemeContextValue {
	theme: () => string;
	setTheme: (id: string) => void;
	isDark: () => boolean;
	toggleDark: () => void;
	setDark: (dark: boolean) => void;
}

const ThemeCtx = createContext<ThemeContextValue>();

const STORAGE_KEY = "robo-pi-theme";

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

export const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
	const [theme, setThemeSignal] = createSignal(getInitialTheme());
	const [isDark, setIsDark] = createSignal(DARK_THEMES.includes(getInitialTheme()));

	const setTheme = (id: string) => {
		setThemeSignal(id);
		setIsDark(DARK_THEMES.includes(id));
		document.documentElement.setAttribute("data-theme", id);
		localStorage.setItem(STORAGE_KEY, id);
	};

	const toggleDark = () => {
		setTheme(isDark() ? "light" : "dark");
	};

	const setDark = (dark: boolean) => {
		setTheme(dark ? "dark" : "light");
	};

	// Apply theme on mount
	document.documentElement.setAttribute("data-theme", getInitialTheme());

	return (
		<ThemeCtx.Provider value={{ theme, setTheme, isDark, toggleDark, setDark }}>{props.children}</ThemeCtx.Provider>
	);
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeCtx);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
