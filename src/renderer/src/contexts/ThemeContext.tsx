import { type Component, createContext, createSignal, type JSX, useContext } from "solid-js";

// ============================================================================
// Available themes (must match @plugin daisyUI themes in tailwind.css)
// ============================================================================

export const THEMES = [
	"robo",
	"robo-dark",
	"Daisy",
	"dark",
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
}

const ThemeCtx = createContext<ThemeContextValue>();

const STORAGE_KEY = "robo-pi-theme";

function getInitialTheme(): string {
	return localStorage.getItem(STORAGE_KEY) ?? "robo";
}

export const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
	const [theme, setThemeSignal] = createSignal(getInitialTheme());
	const DARK_THEMES = [
		"robo-dark",
		"dark", "night", "dracula", "synthwave", "cyberpunk", "halloween",
		"forest", "black", "luxury", "coffee", "dim", "sunset", "abyss", "business",
	];
	const [isDark, setIsDark] = createSignal(
		DARK_THEMES.includes(getInitialTheme()),
	);

	const setTheme = (id: string) => {
		setThemeSignal(id);
		setIsDark(DARK_THEMES.includes(id));
		document.documentElement.setAttribute("data-theme", id);
		localStorage.setItem(STORAGE_KEY, id);
	};

	// Dark theme list — robo's own dark variant + daisyUI built-in dark themes

	const toggleDark = () => {
		setTheme(isDark() ? "robo" : "robo-dark");
	};

	// Apply theme on mount
	document.documentElement.setAttribute("data-theme", getInitialTheme());

	return <ThemeCtx.Provider value={{ theme, setTheme, isDark, toggleDark }}>{props.children}</ThemeCtx.Provider>;
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeCtx);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
