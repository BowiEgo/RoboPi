import { FileText, Library, Pencil, Trash2, X } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Search from "@/components/Search/Search";

import { cstyle } from "@/utils/cstyle";

// ── Mock data ──

const MOCK_KB = {
	name: "产品需求文档",
	size: "2.4 MB",
	docs: 3,
	chunks: 45,
	hits: 12,
	strategy: "自动分段与清洗",
};

const MOCK_DOCS = [
	{ id: "d1", name: "产品需求文档.pdf", pages: 6 },
	{ id: "d2", name: "使用说明书.txt", pages: 4 },
	{ id: "d3", name: "数据分析报告.docx", pages: 8 },
];

function mockPages(name: string, count: number): { page: number; content: string }[] {
	return Array.from({ length: count }, (_, i) => ({
		page: i + 1,
		content: `${name} 第 ${i + 1} 页的示例内容。此段文字用于展示原始文档预览的效果。`,
	}));
}

function mockChunks(name: string, count: number): { id: string; title: string; content: string }[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `chunk-${i + 1}`,
		title: `分片 ${i + 1}`,
		content: `${name} 的第 ${i + 1} 个分段。这里是分段清洗后的文本预览。`,
	}));
}

// ── Styles ──

const C = {
	root: cstyle({ display: "flex flex-col", sizing: "h-full" }),
	header: cstyle({
		display: "flex items-center",
		spacing: "gap-3 px-6 py-4",
		sizing: "shrink-0",
		interaction: "border-b",
		color: "border-base-200",
	}),
	closeBtn: cstyle({
		display: "btn btn-ghost btn-sm btn-square",
		color: "text-base-content/60 hover:text-base-content",
	}),
	kbIcon: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-9 h-9 shrink-0",
		interaction: "rounded-lg",
		color: "bg-primary/10 text-primary",
	}),
	kbInfo: cstyle({ display: "flex flex-col", sizing: "min-w-0" }),
	kbName: cstyle({ text: "text-base font-semibold truncate", color: "text-base-content" }),
	tagRow: cstyle({
		display: "flex items-center flex-wrap",
		spacing: "gap-1.5 mt-1",
	}),
	tag: cstyle({
		display: "inline-flex items-center",
		spacing: "px-2 py-0.5",
		interaction: "rounded-full",
		text: "text-[11px]",
		color: "bg-base-200 text-base-content/60",
	}),
	addBtn: cstyle({
		display: "btn btn-sm btn-soft",
		spacing: "gap-1.5",
	}),
	addToAgentBtn: cstyle({
		display: "btn btn-sm btn-primary",
		spacing: "gap-1.5",
	}),
	// ── Body ──
	body: cstyle({ display: "flex", sizing: "flex-1 min-h-0" }),
	leftCol: cstyle({
		display: "flex flex-col",
		sizing: "w-72 shrink-0",
		spacing: "gap-3 p-4",
		interaction: "border-r",
		color: "border-base-200",
	}),
	docList: cstyle({ display: "flex flex-col", sizing: "flex-1 overflow-y-auto", spacing: "gap-1" }),
	docItem: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-2.5 py-2",
		text: "text-sm",
		interaction: "rounded-md cursor-pointer transition-colors",
		color: "hover:bg-base-200",
		variants: {
			active: { true: "bg-primary/10 text-primary", false: "text-base-content/80" },
		},
	}),
	rightCol: cstyle({ display: "flex flex-col", sizing: "flex-1 min-w-0" }),
	rightHeader: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-5 py-3",
		sizing: "shrink-0",
		interaction: "border-b",
		color: "border-base-200",
	}),
	docName: cstyle({ text: "text-sm font-medium truncate", color: "text-base-content" }),
	editBtn: cstyle({
		display: "btn btn-ghost btn-xs btn-square",
		color: "text-base-content/50 hover:text-base-content",
	}),
	strategyTag: cstyle({
		display: "inline-flex items-center",
		spacing: "px-2 py-0.5",
		interaction: "rounded-full",
		text: "text-[11px]",
		color: "bg-primary/10 text-primary",
	}),
	modeGroup: cstyle({
		display: "flex items-center",
		spacing: "gap-2 ml-auto",
	}),
	modeLabel: cstyle({ text: "text-xs", color: "text-base-content/50" }),
	deleteBtn: cstyle({
		display: "btn btn-ghost btn-xs btn-square",
		color: "text-error/70 hover:text-error",
	}),
	previewBody: cstyle({
		display: "flex flex-col",
		spacing: "gap-2 p-4",
		sizing: "flex-1 overflow-y-auto",
	}),
	chunkCard: cstyle({
		display: "flex flex-col",
		spacing: "gap-1 p-3",
		interaction: "rounded-lg",
		color: "bg-base-200/70",
	}),
	chunkTitle: cstyle({ text: "text-xs font-medium", color: "text-base-content" }),
	chunkText: cstyle({ text: "text-xs leading-relaxed", color: "text-base-content/60" }),
	pageCard: cstyle({
		display: "flex flex-col",
		spacing: "gap-1 p-3",
		interaction: "rounded-lg border",
		color: "border-base-200 bg-base-100",
	}),
	pageNum: cstyle({ text: "text-xs font-medium", color: "text-primary" }),
	pageText: cstyle({ text: "text-xs leading-relaxed", color: "text-base-content/60" }),
	titleInput: cstyle({
		display: "text-sm font-medium",
		interaction: "border rounded outline-none",
		spacing: "px-1.5 py-0.5",
		color: "bg-base-100 border-primary",
	}),
};

// ── Component ──

const KnowledgePreview: Component<{ onClose: () => void }> = (props) => {
	const { t } = useLocale();
	const [selectedDocId, setSelectedDocId] = createSignal(MOCK_DOCS[0].id);
	const [previewMode, setPreviewMode] = createSignal<"raw" | "chunk">("chunk");
	const [editingTitle, setEditingTitle] = createSignal(false);
	const [docTitle, setDocTitle] = createSignal(MOCK_DOCS[0].name);

	const selectedDoc = () => MOCK_DOCS.find((d) => d.id === selectedDocId()) ?? MOCK_DOCS[0];
	const pages = () => mockPages(selectedDoc().name, selectedDoc().pages);
	const chunks = () => mockChunks(selectedDoc().name, Math.ceil(selectedDoc().pages / 2));

	function selectDoc(id: string, name: string) {
		setSelectedDocId(id);
		setDocTitle(name);
		setEditingTitle(false);
	}

	function commitTitle() {
		setEditingTitle(false);
	}

	return (
		<div class={C.root()}>
			<header class={C.header()}>
				<button type="button" class={C.closeBtn()} onClick={props.onClose} aria-label="Close">
					<X class="w-4 h-4" />
				</button>
				<span class={C.kbIcon()}>
					<Library class="w-5 h-5" />
				</span>
				<div class={C.kbInfo()}>
					<span class={C.kbName()}>{MOCK_KB.name}</span>
					<div class={C.tagRow()}>
						<span class={C.tag()}>{MOCK_KB.size}</span>
						<span class={C.tag()}>
							{MOCK_KB.docs} {t("knowledge.docsLabel")}
						</span>
						<span class={C.tag()}>
							{MOCK_KB.chunks} {t("knowledge.chunksLabel")}
						</span>
						<span class={C.tag()}>
							{MOCK_KB.hits} {t("knowledge.hitsLabel")}
						</span>
					</div>
				</div>
				<div class="flex items-center gap-2 ml-auto">
					<button type="button" class={C.addBtn()}>
						{t("knowledge.addContent")}
					</button>
					<button type="button" class={C.addToAgentBtn()}>
						{t("knowledge.addToAgent")}
					</button>
				</div>
			</header>

			<div class={C.body()}>
				{/* 左：搜索 + 文档列表 */}
				<div class={C.leftCol()}>
					<Search placeholder={t("knowledge.search")} />
					<div class={C.docList()}>
						<For each={MOCK_DOCS}>
							{(d) => (
								<button
									type="button"
									class={C.docItem({ active: selectedDocId() === d.id })}
									onClick={() => selectDoc(d.id, d.name)}
								>
									<FileText class="w-4 h-4 shrink-0" />
									<span class="flex-1 min-w-0 truncate">{d.name}</span>
								</button>
							)}
						</For>
					</div>
				</div>

				{/* 右：分段/原始预览 */}
				<div class={C.rightCol()}>
					<div class={C.rightHeader()}>
						<FileText class="w-4 h-4 shrink-0 text-base-content/50" />
						<Show
							when={editingTitle()}
							fallback={<span class={C.docName()}>{docTitle()}</span>}
						>
							<input
								type="text"
								class={C.titleInput()}
								value={docTitle()}
								ref={(el) => queueMicrotask(() => el.focus())}
								onInput={(e) => setDocTitle(e.currentTarget.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") commitTitle();
									if (e.key === "Escape") {
										setDocTitle(selectedDoc().name);
										setEditingTitle(false);
									}
								}}
								onBlur={commitTitle}
							/>
						</Show>
						<button
							type="button"
							class={C.editBtn()}
							aria-label={t("knowledge.editTitle")}
							onClick={() => setEditingTitle(true)}
						>
							<Pencil class="w-3.5 h-3.5" />
						</button>
						<span class={C.strategyTag()}>{MOCK_KB.strategy}</span>

						<div class={C.modeGroup()}>
							<span class={C.modeLabel()}>
								{previewMode() === "raw" ? t("knowledge.previewRaw") : t("knowledge.previewChunk")}
							</span>
							<input
								type="checkbox"
								class="toggle toggle-primary toggle-xs"
								checked={previewMode() === "chunk"}
								onChange={(e) => setPreviewMode(e.currentTarget.checked ? "chunk" : "raw")}
							/>
							<button type="button" class={C.deleteBtn()} aria-label={t("knowledge.deleteDoc")}>
								<Trash2 class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<div class={C.previewBody()}>
						<Show when={previewMode() === "chunk"} fallback={null}>
							<For each={chunks()}>
								{(c) => (
									<div class={C.chunkCard()}>
										<span class={C.chunkTitle()}>{c.title}</span>
										<p class={C.chunkText()}>{c.content}</p>
									</div>
								)}
							</For>
						</Show>
						<Show when={previewMode() === "raw"}>
							<For each={pages()}>
								{(p) => (
									<div class={C.pageCard()}>
										<span class={C.pageNum()}>
											{t("knowledge.pages")} {p.page}
										</span>
										<p class={C.pageText()}>{p.content}</p>
									</div>
								)}
							</For>
						</Show>
					</div>
				</div>
			</div>
		</div>
	);
};

export default KnowledgePreview;
