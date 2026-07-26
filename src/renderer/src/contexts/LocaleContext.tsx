import {
	type Component,
	type JSX,
	createContext,
	createSignal,
	createEffect,
	useContext,
} from "solid-js";
import en from "../locales/en.json";
import zhCN from "../locales/zh-CN.json";

export type LocaleId = "en" | "zh-CN";

interface LocaleDict {
	[key: string]: string;
}

const LOCALE_DATA: Record<LocaleId, LocaleDict> = {
	en,
	"zh-CN": zhCN,
};

interface LocaleContextValue {
	locale: () => LocaleId;
	setLocale: (id: LocaleId) => void;
	t: (key: string, params?: Record<string, string>) => string;
}

const Ctx = createContext<LocaleContextValue>();

/** 简单插值替换："{name}" → params.name */
function interpolate(template: string, params?: Record<string, string>): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

export const LocaleProvider: Component<{ children: JSX.Element }> = (props) => {
	const saved = (localStorage.getItem("robo-pi-locale") ?? "zh-CN") as LocaleId;
	const [locale, setLocale] = createSignal<LocaleId>(saved);

	createEffect(() => {
		localStorage.setItem("robo-pi-locale", locale());
	});

	const t: LocaleContextValue["t"] = (key, params) => {
		const dict = LOCALE_DATA[locale()];
		const template = dict[key];
		if (template === undefined) {
			if (locale() !== "en") {
				const fallback = LOCALE_DATA.en[key];
				return fallback !== undefined ? interpolate(fallback, params) : key;
			}
			return key;
		}
		return interpolate(template, params);
	};

	return (
		<Ctx.Provider value={{ locale, setLocale, t }}>
			{props.children}
		</Ctx.Provider>
	);
};

export function useLocale(): LocaleContextValue {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
	return ctx;
}
