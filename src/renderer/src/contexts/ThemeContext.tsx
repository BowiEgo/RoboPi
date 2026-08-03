import {
	type Component,
	createContext,
	createSignal,
	type JSX,
	useContext,
} from "solid-js";

// ============================================================================
// Available themes (must match @plugin daisyUI themes in tailwind.css)
// ============================================================================

export const THEMES = [
	"light",
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
	return localStorage.getItem(STORAGE_KEY) ?? "dark";
}

export const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
	const [theme, setThemeSignal] = createSignal(getInitialTheme());

	const setTheme = (id: string) => {
		setThemeSignal(id);
		document.documentElement.setAttribute("data-theme", id);
		localStorage.setItem(STORAGE_KEY, id);
	};

	// Check if the current theme visually looks dark (handles all daisyUI themes)
	const isDark = () => {
		const html = document.documentElement;
		const style = getComputedStyle(html);
		// daisyUI sets color-scheme based on theme brightness
		return style.colorScheme === "dark";
	};

	const toggleDark = () => {
		setTheme(isDark() ? "light" : "dark");
	};

	// Apply theme on mount
	document.documentElement.setAttribute("data-theme", getInitialTheme());

	return (
		<ThemeCtx.Provider value={{ theme, setTheme, isDark, toggleDark }}>
			{props.children}
		</ThemeCtx.Provider>
	);
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeCtx);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
