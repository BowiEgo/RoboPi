import { ArrowLeft, ChevronDown, ChevronRight, FileText, Upload } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import { cstyle } from "@/utils/cstyle";

interface KnowledgeUploadViewProps {
	/** Return to the previous page (the create-knowledge form). */
	onBack: () => void;
	onNext: () => void;
	onFiles?: (files: File[]) => void;
}

type Step = "upload" | "settings";
type ParseStrategy = "precise" | "fast";
type SegmentStrategy = "auto" | "custom" | "hierarchy";

const C = {
	root: cstyle({ display: "relative flex flex-col", sizing: "h-full" }),
	header: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-6 py-4",
		sizing: "shrink-0",
		interaction: "border-b",
		color: "border-base-200",
	}),
	backBtn: cstyle({
		display: "btn btn-ghost btn-sm",
		spacing: "gap-1.5",
		color: "text-base-content/60 hover:text-base-content",
	}),
	steps: cstyle({
		display: "steps w-full",
		spacing: "py-2",
		text: "text-sm",
	}),
	body: cstyle({
		display: "flex flex-col flex-1 items-center",
		spacing: "gap-6 px-8 py-6",
		sizing: "overflow-y-auto",
	}),
	dropzone: cstyle({
		display: "flex flex-col items-center justify-center",
		spacing: "gap-2 px-10 py-16",
		sizing: "w-full",
		text: "text-center",
		interaction: "rounded-xl border-2 border-dashed cursor-pointer transition-colors",
		color: "border-base-300 hover:border-primary/40 bg-base-100",
		variants: {
			dragging: { true: "border-primary bg-primary/5" },
		},
	}),
	uploadIcon: cstyle({
		display: "flex items-center justify-center",
		sizing: "w-12 h-12 mb-2",
		interaction: "rounded-full",
		color: "bg-primary/10 text-primary",
	}),
	uploadHint: cstyle({ text: "text-sm font-medium", color: "text-base-content" }),
	uploadMeta: cstyle({
		text: "text-xs",
		color: "text-base-content/40",
		sizing: "max-w-md",
	}),
	fileList: cstyle({
		display: "flex flex-col",
		spacing: "gap-1",
		sizing: "w-full",
	}),
	fileItem: cstyle({
		display: "flex items-center",
		spacing: "gap-2.5 px-3 py-2",
		interaction: "rounded-lg border",
		color: "border-base-200 bg-base-100",
	}),
	fileName: cstyle({ text: "text-sm truncate", color: "text-base-content" }),
	fileSize: cstyle({ text: "text-xs", color: "text-base-content/40" }),
	// ── Settings step ──
	settingsBody: cstyle({
		display: "flex flex-col",
		spacing: "gap-4",
		sizing: "w-full",
	}),
	collapseSection: cstyle({
		display: "flex flex-col",
		interaction: "rounded-lg border",
		color: "border-base-200",
	}),
	collapseHeader: cstyle({
		display: "flex items-center",
		spacing: "gap-2 px-4 py-3",
		text: "text-sm font-medium text-left",
		interaction: "cursor-pointer",
		color: "text-base-content hover:bg-base-200/50",
	}),
	collapseBody: cstyle({
		display: "flex flex-col",
		spacing: "gap-3 px-4 py-4",
		interaction: "border-t",
		color: "border-base-200",
	}),
	strategyRow: cstyle({ display: "flex", spacing: "gap-2" }),
	strategyCard: cstyle({
		display: "flex flex-col flex-1",
		spacing: "gap-1 px-3 py-2.5",
		text: "text-sm text-left",
		interaction: "rounded-lg border transition-colors cursor-pointer",
		color: "border-base-300 bg-base-100 hover:border-base-content/30",
		variants: {
			active: { true: "border-primary bg-primary/5" },
		},
	}),
	strategyTitle: cstyle({ text: "font-medium", color: "text-base-content" }),
	strategyHint: cstyle({ text: "text-xs", color: "text-base-content/40" }),
	extractRow: cstyle({
		display: "flex items-center",
		spacing: "gap-2",
		text: "text-xs",
		color: "text-base-content/60",
	}),
	extractTag: cstyle({
		display: "inline-flex items-center",
		spacing: "px-2 py-0.5",
		interaction: "rounded-full",
		text: "text-xs",
		color: "bg-base-200 text-base-content/70",
	}),
	filterField: cstyle({ display: "flex flex-col", spacing: "gap-1.5" }),
	filterLabel: cstyle({ text: "text-xs", color: "text-base-content/60" }),
	filterTextarea: cstyle({
		display: "w-full resize-none",
		text: "text-sm",
		interaction: "border rounded-lg outline-none",
		spacing: "px-3 py-2",
		sizing: "min-h-20",
		color: "bg-base-100 border-base-300 focus:border-primary/45",
	}),
	footer: cstyle({
		display: "flex items-center justify-end",
		spacing: "gap-2 px-6 py-4",
		sizing: "shrink-0",
		interaction: "border-t",
		color: "border-base-200",
	}),
};

const KnowledgeUploadView: Component<KnowledgeUploadViewProps> = (props) => {
	const { t } = useLocale();
	const [step, setStep] = createSignal<Step>("upload");
	const [dragging, setDragging] = createSignal(false);
	const [files, setFiles] = createSignal<File[]>([]);
	const [parseStrategy, setParseStrategy] = createSignal<ParseStrategy>("precise");
	const [segmentStrategy, setSegmentStrategy] = createSignal<SegmentStrategy>("auto");
	const [parseCollapsed, setParseCollapsed] = createSignal(false);
	const [segmentCollapsed, setSegmentCollapsed] = createSignal(false);
	const [filter, setFilter] = createSignal("");
	let fileRef: HTMLInputElement | undefined;

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function handleFiles(list: FileList | null) {
		if (!list || list.length === 0) return;
		const added = Array.from(list);
		setFiles((prev) => [...prev, ...added]);
		props.onFiles?.(added);
	}

	return (
		<div class={C.root()}>
			<header class={C.header()}>
				<button type="button" class={C.backBtn()} onClick={props.onBack}>
					<ArrowLeft class="w-4 h-4" />
					<span>{t("knowledge.createTitle")}</span>
				</button>
			</header>

			<ul class={C.steps()}>
				<li class="step step-primary">{t("knowledge.stepUpload")}</li>
				<li class={`step ${step() === "settings" ? "step-primary" : ""}`}>{t("knowledge.stepSettings")}</li>
				<li class="step">{t("knowledge.stepPreview")}</li>
				<li class="step">{t("knowledge.stepProcess")}</li>
			</ul>

			<div class={C.body()}>
				<Show
					when={step() === "settings"}
					fallback={
						<>
							<div
								class={C.dropzone({ dragging: dragging() })}
								onClick={() => fileRef?.click()}
								onDragOver={(e) => {
									e.preventDefault();
									setDragging(true);
								}}
								onDragLeave={() => setDragging(false)}
								onDrop={(e) => {
									e.preventDefault();
									setDragging(false);
									handleFiles(e.dataTransfer?.files ?? null);
								}}
							>
								<span class={C.uploadIcon()}>
									<Upload class="w-6 h-6" />
								</span>
								<p class={C.uploadHint()}>{t("knowledge.uploadHint")}</p>
								<p class={C.uploadMeta()}>{t("knowledge.uploadMeta")}</p>
							</div>

							<input
								ref={fileRef}
								type="file"
								multiple
								accept=".pdf,.txt,.doc,.docx,.md"
								class="hidden"
								onChange={(e) => {
									handleFiles(e.currentTarget.files);
									e.currentTarget.value = "";
								}}
							/>

							<Show when={files().length > 0}>
								<div class={C.fileList()}>
									<For each={files()}>
										{(f) => (
											<div class={C.fileItem()}>
												<FileText class="w-4 h-4 shrink-0 text-base-content/50" />
												<div class="flex flex-col min-w-0">
													<span class={C.fileName()}>{f.name}</span>
													<span class={C.fileSize()}>{formatFileSize(f.size)}</span>
												</div>
											</div>
										)}
									</For>
								</div>
							</Show>
						</>
					}
				>
					<div class={C.settingsBody()}>
						{/* 文档解析策略 */}
						<section class={C.collapseSection()}>
							<button type="button" class={C.collapseHeader()} onClick={() => setParseCollapsed((v) => !v)}>
								{parseCollapsed() ? <ChevronRight class="w-4 h-4" /> : <ChevronDown class="w-4 h-4" />}
								<span>{t("knowledge.parseStrategy")}</span>
							</button>
							<Show when={!parseCollapsed()}>
								<div class={C.collapseBody()}>
									<div class={C.strategyRow()}>
										<button
											type="button"
											class={C.strategyCard({ active: parseStrategy() === "precise" })}
											onClick={() => setParseStrategy("precise")}
										>
											<span class={C.strategyTitle()}>{t("knowledge.parsePrecise")}</span>
											<span class={C.strategyHint()}>{t("knowledge.parsePreciseHint")}</span>
										</button>
										<button
											type="button"
											class={C.strategyCard({ active: parseStrategy() === "fast" })}
											onClick={() => setParseStrategy("fast")}
										>
											<span class={C.strategyTitle()}>{t("knowledge.parseFast")}</span>
											<span class={C.strategyHint()}>{t("knowledge.parseFastHint")}</span>
										</button>
									</div>

									<Show when={parseStrategy() === "precise"}>
										<div class={C.extractRow()}>
											<span>{t("knowledge.extractContent")}：</span>
											<span class={C.extractTag()}>{t("knowledge.extractImage")}</span>
											<span class={C.extractTag()}>{t("knowledge.extractOcr")}</span>
											<span class={C.extractTag()}>{t("knowledge.extractTable")}</span>
										</div>
										<div class={C.filterField()}>
											<span class={C.filterLabel()}>{t("knowledge.contentFilter")}</span>
											<textarea
												class={C.filterTextarea()}
												placeholder={t("knowledge.filterPlaceholder")}
												value={filter()}
												onInput={(e) => setFilter(e.currentTarget.value)}
											/>
										</div>
									</Show>
								</div>
							</Show>
						</section>

						{/* 分段策略 */}
						<section class={C.collapseSection()}>
							<button
								type="button"
								class={C.collapseHeader()}
								onClick={() => setSegmentCollapsed((v) => !v)}
							>
								{segmentCollapsed() ? <ChevronRight class="w-4 h-4" /> : <ChevronDown class="w-4 h-4" />}
								<span>{t("knowledge.segmentStrategy")}</span>
							</button>
							<Show when={!segmentCollapsed()}>
								<div class={C.collapseBody()}>
									<div class={C.strategyRow()}>
										<button
											type="button"
											class={C.strategyCard({ active: segmentStrategy() === "auto" })}
											onClick={() => setSegmentStrategy("auto")}
										>
											<span class={C.strategyTitle()}>{t("knowledge.segmentAuto")}</span>
											<span class={C.strategyHint()}>{t("knowledge.segmentAutoHint")}</span>
										</button>
										<button
											type="button"
											class={C.strategyCard({ active: segmentStrategy() === "custom" })}
											onClick={() => setSegmentStrategy("custom")}
										>
											<span class={C.strategyTitle()}>{t("knowledge.segmentCustom")}</span>
											<span class={C.strategyHint()}>{t("knowledge.segmentCustomHint")}</span>
										</button>
										<button
											type="button"
											class={C.strategyCard({ active: segmentStrategy() === "hierarchy" })}
											onClick={() => setSegmentStrategy("hierarchy")}
										>
											<span class={C.strategyTitle()}>{t("knowledge.segmentHierarchy")}</span>
											<span class={C.strategyHint()}>{t("knowledge.segmentHierarchyHint")}</span>
										</button>
									</div>
								</div>
							</Show>
						</section>
					</div>
				</Show>
			</div>

			<footer class={C.footer()}>
				<button
					type="button"
					class="btn btn-primary"
					onClick={() => {
						if (step() === "upload") setStep("settings");
						else props.onNext();
					}}
				>
					{t("knowledge.next")}
				</button>
			</footer>
		</div>
	);
};

export default KnowledgeUploadView;
