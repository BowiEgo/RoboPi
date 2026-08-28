import { FileText, Image, Plus, Table } from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Dropdown from "@/components/Dropdown/Dropdown";
import Resizer from "@/components/Resizer/Resizer";
import Search from "@/components/Search/Search";

import CreateKnowledgeModal from "./CreateKnowledgeModal";
import KnowledgePreview from "./KnowledgePreview";
import KnowledgeUploadView from "./KnowledgeUploadView";

import { cstyle } from "@/utils/cstyle";

// ── Types ──

type KnowledgeType = "document" | "sheet" | "image";

interface KnowledgeBase {
	id: string;
	name: string;
	type: KnowledgeType;
	createdAt: number;
}

const TYPE_ICONS: Record<KnowledgeType, typeof FileText> = {
	document: FileText,
	sheet: Table,
	image: Image,
};

// Mock data (backend integration comes later).
const MOCK_KNOWLEDGE: KnowledgeBase[] = [
	{ id: "kb-1", name: "产品需求文档", type: "document", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
	{ id: "kb-2", name: "销售数据表格", type: "sheet", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7 },
	{ id: "kb-3", name: "产品截图素材", type: "image", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12 },
];

function fmtDate(ms: number): string {
	return new Date(ms).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ── Styles ──

const root = cstyle({ base: "flex h-full overflow-hidden" });
const drawer = "relative shrink-0";
const aside = "flex flex-col h-full pt-3 overflow-hidden select-none";
const sidebarContent = "flex-1 p-3";
const main = cstyle({ base: "flex-1 flex flex-col overflow-hidden p-8 pt-0 pl-5" });

const C = {
	panel: cstyle({
		display: "relative flex flex-col",
		sizing: "h-full overflow-hidden",
		interaction: "rounded-2xl shadow-xl",
		color: "bg-app",
	}),
	filterBar: cstyle({
		display: "flex items-center",
		spacing: "gap-3 px-6 py-4",
		sizing: "shrink-0",
		interaction: "border-b",
		color: "border-base-200",
	}),
	content: cstyle({
		display: "flex flex-1 items-center justify-center",
	}),
	createBtn: cstyle({
		display: "btn btn-primary btn-lg",
		spacing: "gap-2",
	}),
	// ── Knowledge list ──
	list: cstyle({ display: "flex flex-col", spacing: "gap-0.5 mt-2" }),
	item: cstyle({
		display: "group flex items-center",
		spacing: "gap-2 px-3 py-2",
		interaction: "cursor-pointer rounded-md transition-colors",
		color: "hover:bg-base-200",
	}),
	itemIcon: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-7 h-7 shrink-0",
		interaction: "rounded-md",
		color: "bg-base-200 text-base-content/70",
	}),
	itemName: cstyle({
		display: "flex-1 min-w-0",
		text: "text-sm truncate",
		color: "text-base-content/80",
	}),
	itemTime: cstyle({ text: "text-[10px]", color: "text-base-content/30" }),
	empty: cstyle({
		text: "text-xs text-center",
		spacing: "px-1 py-4",
		color: "text-base-content/40",
	}),
};

// ── Component ──

const KnowledgePage: Component = () => {
	const { t } = useLocale();
	const [search, setSearch] = createSignal("");
	const [typeFilter, setTypeFilter] = createSignal("all");
	const [timeSort, setTimeSort] = createSignal("newest");
	const [nameSort, setNameSort] = createSignal("nameAsc");
	const [drawerWidth, setDrawerWidth] = createSignal(300);
	const [createOpen, setCreateOpen] = createSignal(false);
	const [view, setView] = createSignal<"main" | "upload" | "detail">("main");

	const typeOptions = () => [
		{ id: "all", name: t("knowledge.typeAll") },
		{ id: "document", name: t("knowledge.typeDocument") },
		{ id: "sheet", name: t("knowledge.typeSheet") },
		{ id: "image", name: t("knowledge.typeImage") },
	];
	const timeOptions = () => [
		{ id: "newest", name: t("knowledge.newest") },
		{ id: "oldest", name: t("knowledge.oldest") },
	];
	const nameOptions = () => [
		{ id: "nameAsc", name: t("knowledge.nameAsc") },
		{ id: "nameDesc", name: t("knowledge.nameDesc") },
	];

	const filtered = createMemo(() => {
		const q = search().trim().toLowerCase();
		let items = MOCK_KNOWLEDGE;
		if (typeFilter() !== "all") items = items.filter((kb) => kb.type === typeFilter());
		if (q) items = items.filter((kb) => kb.name.toLowerCase().includes(q));
		if (timeSort() === "newest") items = [...items].sort((a, b) => b.createdAt - a.createdAt);
		else items = [...items].sort((a, b) => a.createdAt - b.createdAt);
		if (nameSort() === "nameAsc") items = [...items].sort((a, b) => a.name.localeCompare(b.name));
		else items = [...items].sort((a, b) => b.name.localeCompare(a.name));
		return items;
	});

	return (
		<div class={`${root()} bg-app-raised`}>
			<div class={drawer} style={{ width: `${drawerWidth()}px` }}>
				<aside class={`${aside} text-base-content`}>
					<div class={`${sidebarContent} text-base-content`}>
						<Search value={search()} placeholder={t("knowledge.search")} onInput={setSearch} />
						<div class={C.list()}>
							<Show
								when={filtered().length > 0}
								fallback={<div class={C.empty()}>{t("knowledge.empty")}</div>}
							>
								<For each={filtered()}>
									{(kb) => {
										const Icon = TYPE_ICONS[kb.type];
										return (
											<div class={C.item()}>
												<span class={C.itemIcon()}>
													<Icon class="w-4 h-4" />
												</span>
												<span class={C.itemName()}>{kb.name}</span>
												<span class={C.itemTime()}>{fmtDate(kb.createdAt)}</span>
											</div>
										);
									}}
								</For>
							</Show>
						</div>
					</div>
				</aside>
				<Resizer value={drawerWidth()} min={200} max={500} position="right" grip={false} onChange={(v) => setDrawerWidth(v)} />
			</div>

			<main class={`${main()} text-base-content`}>
				<div class={C.panel()}>
					<Show when={view() === "main"}>
						<>
								<div class={C.filterBar()}>
									<Dropdown
										value={typeFilter()}
										options={typeOptions()}
										placeholder={t("knowledge.type")}
										width="10rem"
										searchable={false}
										onChange={setTypeFilter}
									/>
									<Dropdown
										value={timeSort()}
										options={timeOptions()}
										placeholder={t("knowledge.sortTime")}
										width="10rem"
										searchable={false}
										onChange={setTimeSort}
									/>
									<Dropdown
										value={nameSort()}
										options={nameOptions()}
										placeholder={t("knowledge.sortName")}
										width="10rem"
										searchable={false}
										onChange={setNameSort}
									/>
								</div>

								<div class={C.content()}>
									<button type="button" class={C.createBtn()} onClick={() => setCreateOpen(true)}>
										<Plus class="w-5 h-5" />
										<span>{t("knowledge.create")}</span>
									</button>
								</div>
							</>
					</Show>

					<Show when={view() === "upload"}>
						<KnowledgeUploadView onBack={() => setView("main")} onNext={() => setView("detail")} />
					</Show>

					<Show when={view() === "detail"}>
						<KnowledgePreview onClose={() => setView("main")} />
					</Show>
				</div>
			</main>

			<CreateKnowledgeModal
				open={createOpen()}
				onClose={() => setCreateOpen(false)}
				onCreateImport={() => {
					setCreateOpen(false);
					setView("upload");
				}}
			/>
		</div>
	);
};

export default KnowledgePage;
