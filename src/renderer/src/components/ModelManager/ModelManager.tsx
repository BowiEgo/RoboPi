import { Eye, EyeOff, Plus, Trash2 } from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Dropdown from "@/components/Dropdown/Dropdown";
import Modal from "@/components/Modal/Modal";
import ProviderIcon from "@/components/ProviderIcon/ProviderIcon";

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
	keyField: cstyle({ display: "relative flex" }),
	apiKeyInput: cstyle({
		display: "input input-bordered input-sm",
		sizing: "flex-1",
		text: "font-mono text-xs",
		spacing: "pr-9",
	}),
	toggleKeyBtn: cstyle({
		display: "absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center",
		sizing: "w-5 h-5",
		interaction: "rounded",
		color: "text-base-content/40 hover:text-base-content",
	}),
	footer: cstyle({
		display: "flex justify-end",
		spacing: "pt-2 gap-2",
		interaction: "border-t",
		color: "border-base-200",
	}),
	cancelBtn: cstyle({ display: "btn btn-ghost btn-sm" }),
	saveBtn: cstyle({ display: "btn btn-primary btn-sm" }),
};

// ── Component ──

const ModelManager: Component<ModelManagerProps> = (props) => {
	const { t } = useLocale();
	const [modalOpen, setModalOpen] = createSignal(false);
	const [provider, setProvider] = createSignal("");
	const [apiKey, setApiKey] = createSignal("");
	const [showKey, setShowKey] = createSignal(false);

	const providers = createMemo(() => [...props.providerList, { id: "custom", name: t("settings.customProvider") }]);

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
								<ProviderIcon
									provider={providers().find((p) => p.name === model.provider)?.id ?? model.provider}
								/>
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

			<Modal
				open={modalOpen()}
				onClose={() => setModalOpen(false)}
				title={t("settings.addProvider")}
				minWidth="28rem"
				bodyOverflow="visible"
			>
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
					<div class={C.keyField()}>
						<input
							type={showKey() ? "text" : "password"}
							class={C.apiKeyInput()}
							placeholder={t("settings.apiKeyPlaceholder")}
							value={apiKey()}
							onInput={(e) => setApiKey(e.currentTarget.value)}
						/>
						<button
							type="button"
							class={C.toggleKeyBtn()}
							onClick={() => setShowKey((v) => !v)}
							aria-label={showKey() ? t("settings.hideApiKey") : t("settings.showApiKey")}
						>
							<Show when={showKey()} fallback={<Eye class="w-3.5 h-3.5" />}>
								<EyeOff class="w-3.5 h-3.5" />
							</Show>
						</button>
					</div>
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
