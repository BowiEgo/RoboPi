// ── cx() — class composition helper ──

export type ColorVal = string | Record<string, string>;

export interface ClassDef {
	display?: string;
	spacing?: string;
	interaction?: string;
	sizing?: string;
	text?: string;
	color?: ColorVal;
	colorDark?: ColorVal;
}

export function cx(def: ClassDef, states?: Record<string, boolean>): string {
	const parts: string[] = [];

	for (const k of ["display", "spacing", "interaction", "sizing", "text"]) {
		const v = def[k as keyof ClassDef] as string | undefined;
		if (v) parts.push(v);
	}

	const pick = (val: ColorVal | undefined, dark: boolean) => {
		if (!val) return;
		if (states) {
			for (const [k, on] of Object.entries(states)) {
				if (!on || typeof val === "string") continue;
				const v = val[k];
				if (v) parts.push(dark ? `dark:${v}` : v);
			}
		} else if (typeof val === "string" && val) {
			parts.push(dark ? `dark:${val}` : val);
		}
	};

	pick(def.color, false);
	pick(def.colorDark, true);
	return parts.join(" ");
}
