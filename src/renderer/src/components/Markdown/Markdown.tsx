import MarkdownIt from "markdown-it";
import { createHighlighter, type Highlighter } from "shiki";
import { type Component, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import "./Markdown.css";

// ── Shiki highlighter singleton ──

let _highlighter: Highlighter | null = null;
let _hlPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	if (_highlighter) return Promise.resolve(_highlighter);
	if (_hlPromise) return _hlPromise;

	_hlPromise = createHighlighter({
		themes: ["dark-plus", "github-light"],
		langs: [
			"typescript",
			"javascript",
			"tsx",
			"jsx",
			"json",
			"jsonc",
			"bash",
			"shell",
			"python",
			"rust",
			"go",
			"html",
			"css",
			"scss",
			"sql",
			"yaml",
			"toml",
			"markdown",
			"text",
			"xml",
			"diff",
			"graphql",
			"regexp",
			"lua",
			"ruby",
		],
	}).then((h) => {
		_highlighter = h;
		return h;
	});

	return _hlPromise;
}

// Eagerly start loading
getHighlighter();

// ── Helpers ──

function resolveTheme(): string {
	if (typeof document === "undefined") return "github-light";
	const t = document.documentElement.dataset.theme || "";
	const darkThemes = ["robo-dark", "dark", "night", "dracula", "synthwave", "cyberpunk", "halloween", "forest", "black", "luxury", "coffee", "dim", "sunset", "abyss", "business"];
	return darkThemes.includes(t) ? "dark-plus" : "github-light";
}

function langDisplay(lang: string): string {
	if (!lang) return "";
	return lang.toLowerCase();
}

// ── markdown-it instance ──

const md = new MarkdownIt({
	html: false,
	breaks: true,
	linkify: true,
	typographer: true,
});

// Override heading_open
md.renderer.rules.heading_open = (tokens, idx) => {
	const token = tokens[idx];
	const tag = token.tag;
	const classMap: Record<string, string> = {
		h1: "text-[28px] font-semibold leading-tight my-3 text-base-content",
		h2: "text-[22px] font-semibold leading-snug my-3 pb-1 border-b border-base-300 text-base-content",
		h3: "text-lg font-semibold leading-snug my-2 text-base-content",
		h4: "text-base font-semibold leading-snug my-1 text-base-content/70",
	};
	return `<${tag} class="${classMap[tag] || ""}">`;
};

md.renderer.rules.heading_close = (tokens, idx) => {
	const tag = tokens[idx].tag;
	return `</${tag}>`;
};

// Override paragraph
md.renderer.rules.paragraph_open = () => '<p class="m-0 leading-relaxed">';
md.renderer.rules.paragraph_close = () => "</p>";

// Override blockquote
md.renderer.rules.blockquote_open = () =>
	'<blockquote class="m-0 px-3 py-1 border-l-[3px] border-primary bg-base-200 rounded-r-sm italic text-base-content/70 leading-relaxed">';
md.renderer.rules.blockquote_close = () => "</blockquote>";

// Override unordered list
md.renderer.rules.bullet_list_open = () => '<ul class="m-0 pl-5 list-disc">';
md.renderer.rules.bullet_list_close = () => "</ul>";

// Override ordered list
md.renderer.rules.ordered_list_open = (_tokens, idx) => {
	const start = _tokens[idx].attrGet("start");
	return `<ol class="m-0 pl-5 list-decimal"${start ? ` start="${start}"` : ""}>`;
};
md.renderer.rules.ordered_list_close = () => "</ol>";

// Override list item
md.renderer.rules.list_item_open = () => '<li class="leading-relaxed">';
md.renderer.rules.list_item_close = () => "</li>";

// Override horizontal rule
md.renderer.rules.hr = () => '<hr class="border-none border-t border-base-300 my-3" />';

// Override inline code
md.renderer.rules.code_inline = (tokens, idx) => {
	const content = md.utils.escapeHtml(tokens[idx].content);
	return `<code class="bg-base-300 text-primary rounded px-1 py-0.5 font-mono text-[0.9em]">${content}</code>`;
};

// Override fence (code block) — sync fallback, Shiki handles when loaded
md.renderer.rules.fence = (tokens, idx) => {
	const token = tokens[idx];
	const rawLang = token.info.trim().split(/\s+/)[0] || "";
	const code = token.content;
	const lang = langDisplay(rawLang);

	// Try Shiki highlighting
	if (_highlighter) {
		try {
			const theme = resolveTheme();
			const highlighted = _highlighter.codeToHtml(code, {
				lang: rawLang || "text",
				theme,
			});
			// Replace shiki's default <pre> wrapper with our styled one
			return highlighted
				.replace(
					/<pre[^>]*>/,
					`<div class="md-code-block rounded-box overflow-hidden bg-base-200 border border-base-300"><div class="md-code-lang px-3 py-1 font-mono text-[11px] text-base-content/50 uppercase tracking-wider bg-base-300 border-b border-base-300">${lang || "code"}</div><pre class="shiki m-0 p-3 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre">`,
				)
				.replace("</pre>", "</pre></div>");
		} catch {
			// Fall through to plain version
		}
	}

	// Plain fallback
	const langLabel = lang
		? `<div class="md-code-lang px-3 py-1 font-mono text-[11px] text-base-content/50 uppercase tracking-wider bg-base-300 border-b border-base-300">${lang}</div>`
		: "";
	return `<div class="md-code-block rounded-box overflow-hidden bg-base-200 border border-base-300">${langLabel}<pre class="m-0 p-3 overflow-x-auto font-mono text-sm leading-relaxed text-base-content whitespace-pre"><code>${md.utils.escapeHtml(code)}</code></pre></div>`;
};

// Override link
md.renderer.rules.link_open = (tokens, idx) => {
	const token = tokens[idx];
	const href = token.attrGet("href") ?? "";
	return `<a href="${href}" target="_blank" rel="noopener" class="text-primary underline underline-offset-2 hover:opacity-80">`;
};
md.renderer.rules.link_close = () => "</a>";

// Override image
md.renderer.rules.image = (tokens, idx) => {
	const token = tokens[idx];
	const src = token.attrGet("src") ?? "";
	const alt = token.content;
	return `<img src="${src}" alt="${alt}" class="max-w-full rounded-box my-2" loading="lazy" />`;
};

// Override emphasis
md.renderer.rules.em_open = () => "<em>";
md.renderer.rules.em_close = () => "</em>";
md.renderer.rules.strong_open = () => '<strong class="font-semibold">';
md.renderer.rules.strong_close = () => "</strong>";

// Override table
md.renderer.rules.table_open = () =>
	'<div class="overflow-x-auto my-2"><table class="table table-zebra table-sm w-full">';
md.renderer.rules.table_close = () => "</table></div>";
md.renderer.rules.thead_open = () => "<thead>";
md.renderer.rules.thead_close = () => "</thead>";
md.renderer.rules.tbody_open = () => "<tbody>";
md.renderer.rules.tbody_close = () => "</tbody>";
md.renderer.rules.tr_open = () => "<tr>";
md.renderer.rules.tr_close = () => "</tr>";
md.renderer.rules.th_open = () => '<th class="text-left">';
md.renderer.rules.th_close = () => "</th>";
md.renderer.rules.td_open = () => "<td>";
md.renderer.rules.td_close = () => "</td>";

// ── Component ──

export interface MarkdownProps {
	content: string;
	/** When true, skips Shiki highlighting for better streaming performance */
	streaming?: boolean;
}

const Markdown: Component<MarkdownProps> = (props) => {
	const [hlReady, setHlReady] = createSignal(_highlighter !== null);
	const [theme, setTheme] = createSignal(resolveTheme());

	// Track highlighter loading
	if (!_highlighter) {
		getHighlighter().then(() => setHlReady(true));
	}

	// Watch theme changes to re-render code blocks
	const observer = new MutationObserver(() => {
		const current = resolveTheme();
		if (current !== theme()) {
			setTheme(current);
		}
	});

	createEffect(() => {
		if (typeof document !== "undefined") {
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-theme"],
			});
		}
	});

	onCleanup(() => observer.disconnect());

	const html = createMemo(() => {
		// Track signals so memo re-runs when highlighter loads or theme changes
		void hlReady();
		void theme();
		return md.render(props.content);
	});

	return <div class="md-content flex flex-col gap-2" innerHTML={html()} />;
};

export default Markdown;
