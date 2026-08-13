import { Check, ChevronsUpDown, Plus, Search, Trash2 } from "lucide-solid";
import { setApiKey as persistApiKey } from "@/agent/settings-ipc";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";


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
	onAdd: (model: SavedModel) => void;
	onDelete: (id: string) => void;
}

// ── Derive providers & models from available model IDs ──


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

// ── Dropdown sub-component ──

interface DropdownProps {
	value: string;
	options: { id: string; name: string }[];
	placeholder: string;
	searchable?: boolean;
	onChange: (id: string) => void;
}

const Dropdown: Component<DropdownProps> = (props) => {
	const [open, setOpen] = createSignal(false);
	const [search, setSearch] = createSignal("");
	let containerRef: HTMLDivElement | undefined;

	const filtered = createMemo(() => {
		const q = search().toLowerCase();
		if (!q) return props.options;
		return props.options.filter(
			(o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
		);
	});

	const selectedName = () =>
		props.options.find((o) => o.id === props.value)?.name ?? props.placeholder;

	createEffect(() => {
		if (!open()) return;
		const handler = (e: MouseEvent) => {
			if (containerRef && !containerRef.contains(e.target as Node)) {
				setOpen(false);
				setSearch("");
			}
		};
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	});

	return (
		<div class="relative" ref={containerRef}>
			<button
				type="button"
				class={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border border-base-300 bg-base-200 hover:border-base-content/30 transition-colors ${
					props.value ? "text-base-content" : "text-base-content/40"
				}`}
				onClick={() => setOpen((v) => !v)}
			>
				<span class="truncate">{selectedName()}</span>
				<ChevronsUpDown class="w-3.5 h-3.5 shrink-0 opacity-40" />
			</button>
			<Show when={open()}>
				<div class="absolute z-50 mt-1 w-full rounded-lg border border-base-300 bg-base-100 shadow-xl">
					<Show when={props.searchable !== false}>
						<div class="flex items-center gap-2 px-3 py-2 border-b border-base-200">
							<Search class="w-3.5 h-3.5 text-base-content/30" />
							<input
								type="text"
								class="flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/30"
								placeholder="Search..."
								value={search()}
								onInput={(e) => setSearch(e.currentTarget.value)}
							/>
						</div>
					</Show>
					<div class="max-h-48 overflow-y-auto p-1">
						<For each={filtered()}>
							{(opt) => (
								<button
									type="button"
									class={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
										props.value === opt.id
											? "bg-primary/10 text-primary"
											: "hover:bg-base-200 text-base-content"
									}`}
									onClick={() => {
										props.onChange(opt.id);
										setOpen(false);
										setSearch("");
									}}
								>
									{opt.name}
									<Show when={props.value === opt.id}>
										<Check class="w-3.5 h-3.5" />
									</Show>
								</button>
							)}
						</For>
					</div>
				</div>
			</Show>
		</div>
	);
};

// ── ModelManager Component ──

const ModelManager: Component<ModelManagerProps> = (props) => {
	const [modalOpen, setModalOpen] = createSignal(false);
	const [provider, setProvider] = createSignal("");
	const [apiKey, setApiKey] = createSignal("");

	const providers = createMemo(() => [
		...props.providerList,
		{ id: "custom", name: "Custom (OpenAI-compatible)" },
	]);



	function handleSave() {
		const p = provider();
		const key = apiKey();
		if (!p || !key.trim()) return;
		const provName = providers().find((pr) => pr.id === p)?.name ?? p;
		// Persist API key locally
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
		<div class="flex flex-col gap-4">
			{/* Header */}
			<div class="flex items-start justify-between gap-4">
				<p class="text-xs text-base-content/50 leading-relaxed max-w-120">
					Local model configuration stored in{" "}
					<code class="text-xs bg-base-200 px-1 rounded">%USERPROFILE%\.robopi\models.json</code>
				</p>
				<div class="flex items-center gap-2 shrink-0">
						<button
						type="button"
						class="btn btn-sm btn-outline gap-1.5"
						onClick={() => setModalOpen(true)}
					>
						<Plus class="w-3.5 h-3.5" />
						Add Model
					</button>
				</div>
			</div>

			{/* Saved models */}
			<Show when={props.models.length > 0}>
				<div class="flex flex-col gap-2">
					<For each={props.models}>
						{(model) => (
							<div class="flex items-center gap-3 px-3 py-2 rounded-lg border border-base-300 bg-base-200/50">
								<div
									class={`w-8 h-8 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
										PROVIDER_COLORS[
											providers().find((p) => p.name === model.provider)?.id ?? "custom"
										] ?? "bg-gray-500"
									}`}
								>
									{providerInitials(model.provider)}
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium truncate">{model.name}</div>
									<div class="text-xs text-base-content/40">{model.provider}</div>
								</div>
								<button
									type="button"
									class="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error"
									onClick={() => props.onDelete(model.id)}
									aria-label="Delete model"
								>
									<Trash2 class="w-3.5 h-3.5" />
								</button>
							</div>
						)}
					</For>
				</div>
			</Show>

			{/* ── Modal ── */}
			<Show when={modalOpen()}>
				<div
					class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
					onClick={() => setModalOpen(false)}
				>
					<div
						class="w-full max-w-md mx-4 rounded-2xl bg-base-100 shadow-2xl border border-base-300"
						onClick={(e) => e.stopPropagation()}
					>
						<div class="px-6 py-4 border-b border-base-200">
							<h3 class="text-lg font-semibold text-base-content">Add Provider</h3>
							<p class="text-xs text-base-content/40 mt-1">
								Only OpenAI-compatible API is supported
							</p>
						</div>
						<div class="px-6 py-4 flex flex-col gap-4">
							<div class="flex flex-col gap-1.5">
								<label class="text-xs font-medium text-base-content/60">Provider</label>
								<Dropdown
									value={provider()}
									options={providers()}
									placeholder="Select provider..."
									onChange={setProvider}
								/>
							</div>
							<div class="flex flex-col gap-1.5">
								<label class="text-xs font-medium text-base-content/60">API Key</label>
								<input
									type="password"
									class="input input-bordered input-sm font-mono text-xs"
									placeholder="sk-..."
									value={apiKey()}
									onInput={(e) => setApiKey(e.currentTarget.value)}
								/>
							</div>
						</div>
						<div class="px-6 py-4 border-t border-base-200 flex justify-end gap-2">
							<button
								type="button"
								class="btn btn-ghost btn-sm"
								onClick={() => setModalOpen(false)}
							>
								Cancel
							</button>
							<button
								type="button"
								class="btn btn-primary btn-sm"
								disabled={!provider() || !apiKey().trim()}
								onClick={handleSave}
							>
								Save
							</button>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
};

export default ModelManager;
