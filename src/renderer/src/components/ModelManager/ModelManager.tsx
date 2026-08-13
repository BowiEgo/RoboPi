import { Plus, Trash2 } from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";

import Dropdown from "@/components/Dropdown/Dropdown";
import Modal from "@/components/Modal/Modal";

import { useLocale } from "@/contexts/LocaleContext";
import { setApiKey as persistApiKey } from "@/ipc/settings";
import { cstyle } from "@/utils/cstyle";

// ── Types ──

export interface SavedModel {
	id: string;
	name: string;
	provider: string;
	apiKey?: string;
}

interface ModelManagerProps {
	models: SavedModel[];
	availableModels: string[];
	providerList: { id: string; name: string }[];
	configDir?: string;
	onAdd: (model: SavedModel) => void;
	onDelete: (id: string) => void;
}

// ── Styles ──

const C = {
	root: cstyle({ display: "flex flex-col", spacing: "gap-4" }),
	header: cstyle({ display: "flex items-start justify-between", spacing: "gap-4" }),
	description: cstyle({
		text: "text-xs leading-relaxed",
		sizing: "max-w-120",
		color: "text-base-content/50",
	}),
	headerActions: cstyle({ display: "flex items-center", spacing: "gap-2", sizing: "shrink-0" }),
	addBtn: cstyle({
		display: "btn btn-sm btn-outline",
		spacing: "gap-1.5",
	}),
	modelList: cstyle({ display: "flex flex-col", spacing: "gap-2" }),
	modelItem: cstyle({
		display: "flex items-center",
		spacing: "gap-3 px-3 py-2",
		interaction: "rounded-lg border",
		color: "border-base-300 bg-base-200/50",
	}),
	icon: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-8 h-8 shrink-0",
		text: "text-white text-[10px] font-bold",
		interaction: "rounded-md",
	}),
	modelContent: cstyle({ display: "flex-1", sizing: "min-w-0" }),
	modelName: cstyle({ text: "text-sm font-medium truncate" }),
	modelProvider: cstyle({ text: "text-xs", color: "text-base-content/40" }),
	deleteBtn: cstyle({
		display: "btn btn-ghost btn-xs btn-square",
		color: "text-base-content/30 hover:text-error",
	}),
	subtitle: cstyle({ text: "text-xs", color: "text-base-content/40" }),
	field: cstyle({ display: "flex flex-col", spacing: "gap-1.5" }),
	label: cstyle({ text: "text-xs font-medium", color: "text-base-content/60" }),
	apiKeyInput: cstyle({ display: "input input-bordered input-sm", text: "font-mono text-xs" }),
	footer: cstyle({
		display: "flex justify-end",
		spacing: "pt-2 gap-2",
		interaction: "border-t",
		color: "border-base-200",
	}),
	cancelBtn: cstyle({ display: "btn btn-ghost btn-sm" }),
	saveBtn: cstyle({ display: "btn btn-primary btn-sm" }),
};

// ── Provider icon colors ──

const PROVIDER_COLORS: Record<string, string> = {
	openai: "bg-emerald-500",
	anthropic: "bg-amber-500",
	deepseek: "bg-blue-500",
	groq: "bg-orange-500",
	together: "bg-indigo-500",
	fireworks: "bg-red-500",
	openrouter: "bg-violet-500",
	mistral: "bg-cyan-500",
	xai: "bg-slate-400",
	google: "bg-sky-500",
	perplexity: "bg-pink-500",
	cohere: "bg-teal-500",
	custom: "bg-gray-500",
};

function providerInitials(name: string): string {
	return name.slice(0, 2).toUpperCase();
}

// ── Component ──

const ModelManager: Component<ModelManagerProps> = (props) => {
	const { t } = useLocale();
	const [modalOpen, setModalOpen] = createSignal(false);
	const [provider, setProvider] = createSignal("");
	const [apiKey, setApiKey] = createSignal("");

	const providers = createMemo(() => [
		...props.providerList,
		{ id: "custom", name: t("settings.customProvider") },
	]);

	function handleSave() {
		const p = provider();
		const key = apiKey();
		if (!p || !key.trim()) return;
		const provName = providers().find((pr) => pr.id === p)?.name ?? p;
		persistApiKey(p, key.trim());
		props.onAdd({
			id: `${p}-${Date.now()}`,
			name: provName,
			provider: provName,
			apiKey: key.trim(),
		});
		setProvider("");
		setApiKey("");
		setModalOpen(false);
	}

	return (
		<div class={C.root()}>
			<div class={C.header()}>
				<p class={C.description()}>{t("settings.modelsHint", { path: props.configDir ?? "" })}</p>
				<div class={C.headerActions()}>
					<button type="button" class={C.addBtn()} onClick={() => setModalOpen(true)}>
						<Plus class="w-3.5 h-3.5" />
						{t("settings.addProvider")}
					</button>
				</div>
			</div>

			<Show when={props.models.length > 0}>
				<div class={C.modelList()}>
					<For each={props.models}>
						{(model) => (
							<div class={C.modelItem()}>
								<div
									class={`${C.icon()} ${
										PROVIDER_COLORS[providers().find((p) => p.name === model.provider)?.id ?? "custom"] ?? "bg-gray-500"
									}`}
								>
									{providerInitials(model.provider)}
								</div>
								<div class={C.modelContent()}>
									<div class={C.modelName()}>{model.name}</div>
									<div class={C.modelProvider()}>{model.provider}</div>
								</div>
								<button
									type="button"
									class={C.deleteBtn()}
									onClick={() => props.onDelete(model.id)}
									aria-label={t("settings.deleteProvider")}
								>
									<Trash2 class="w-3.5 h-3.5" />
								</button>
							</div>
						)}
					</For>
				</div>
			</Show>

			<Modal open={modalOpen()} onClose={() => setModalOpen(false)} title={t("settings.addProvider")} width="28rem">
				<p class={C.subtitle()}>{t("settings.addProviderSubtitle")}</p>
				<div class={C.field()}>
					<label class={C.label()}>{t("settings.provider")}</label>
					<Dropdown
						value={provider()}
						options={providers()}
						placeholder={t("settings.selectProvider")}
						onChange={setProvider}
					/>
				</div>
				<div class={C.field()}>
					<label class={C.label()}>{t("settings.apiKey")}</label>
					<input
						type="password"
						class={C.apiKeyInput()}
						placeholder={t("settings.apiKeyPlaceholder")}
						value={apiKey()}
						onInput={(e) => setApiKey(e.currentTarget.value)}
					/>
				</div>
				<div class={C.footer()}>
					<button type="button" class={C.cancelBtn()} onClick={() => setModalOpen(false)}>
						{t("settings.cancel")}
					</button>
					<button type="button" class={C.saveBtn()} disabled={!provider() || !apiKey().trim()} onClick={handleSave}>
						{t("settings.save")}
					</button>
				</div>
			</Modal>
		</div>
	);
};

export default ModelManager;
