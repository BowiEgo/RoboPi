import { type Component } from "solid-js";
import {
	siAnthropic,
	siAntdesign,
	siCloudflare,
	siCloudflareworkers,
	siDeepseek,
	siGithubcopilot,
	siGoogle,
	siHuggingface,
	siKimi,
	siMinimax,
	siMistralai,
	siMoonshotai,
	siNvidia,
	siOpencode,
	siOpenrouter,
	siQwen,
	siVercel,
	siXiaomi,
	siZdotai,
} from "simple-icons";

import { cstyle } from "@/utils/cstyle";

export interface ProviderIconProps {
	provider: string;
	/** Icon/container size (Tailwind size class), default "w-8 h-8". */
	size?: string;
	/** Fallback initials text size, default "text-[10px]". */
	textClass?: string;
}

// ── Brand icon registry (simple-icons) ──

interface IconData {
	path: string;
	hex: string;
}

const PROVIDER_ICONS: Record<string, IconData> = {
	anthropic: siAnthropic,
	"ant-ling": siAntdesign,
	"cloudflare-ai-gateway": siCloudflare,
	"cloudflare-workers-ai": siCloudflareworkers,
	deepseek: siDeepseek,
	"github-copilot": siGithubcopilot,
	google: siGoogle,
	"google-vertex": siGoogle,
	huggingface: siHuggingface,
	"kimi-coding": siKimi,
	minimax: siMinimax,
	"minimax-cn": siMinimax,
	mistral: siMistralai,
	moonshotai: siMoonshotai,
	"moonshotai-cn": siMoonshotai,
	nvidia: siNvidia,
	opencode: siOpencode,
	"opencode-go": siOpencode,
	openrouter: siOpenrouter,
	"qwen-token-plan": siQwen,
	"qwen-token-plan-cn": siQwen,
	"vercel-ai-gateway": siVercel,
	xiaomi: siXiaomi,
	"xiaomi-token-plan-ams": siXiaomi,
	"xiaomi-token-plan-cn": siXiaomi,
	"xiaomi-token-plan-sgp": siXiaomi,
	zai: siZdotai,
	"zai-coding-cn": siZdotai,
};

// ── Fallback colors for providers without a brand icon ──

const FALLBACK_COLORS: Record<string, string> = {
	openai: "bg-emerald-500",
	"openai-codex": "bg-emerald-600",
	groq: "bg-orange-500",
	xai: "bg-slate-400",
	together: "bg-indigo-500",
	fireworks: "bg-red-500",
	cerebras: "bg-teal-500",
	"amazon-bedrock": "bg-amber-600",
	"azure-openai-responses": "bg-sky-600",
	perplexity: "bg-pink-500",
	cohere: "bg-teal-500",
	custom: "bg-gray-500",
};

function initials(name: string): string {
	return name.slice(0, 2).toUpperCase();
}

// ── Styles ──

const C = {
	fallback: cstyle({
		display: "flex items-center justify-center shrink-0",
		interaction: "rounded-md",
		color: "text-white font-bold leading-none",
	}),
};

/**
 * Provider logo. Uses a simple-icons brand SVG when available, otherwise
 * falls back to a colored tile with the provider's initials.
 */
const ProviderIcon: Component<ProviderIconProps> = (props) => {
	const icon = PROVIDER_ICONS[props.provider];
	const size = () => props.size ?? "w-8 h-8";
	const textClass = () => props.textClass ?? "text-[10px]";

	if (icon) {
		return (
			<svg viewBox="0 0 24 24" class={`${size()} shrink-0 block`} role="img" aria-label={props.provider}>
				<path d={icon.path} fill={`#${icon.hex}`} />
			</svg>
		);
	}

	return (
		<div class={`${C.fallback()} ${FALLBACK_COLORS[props.provider] ?? "bg-gray-500"} ${size()} ${textClass()}`}>
			{initials(props.provider)}
		</div>
	);
};

export default ProviderIcon;
