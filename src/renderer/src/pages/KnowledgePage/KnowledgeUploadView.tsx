import { ArrowLeft, Upload } from "lucide-solid";
import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import { cstyle } from "@/utils/cstyle";

interface KnowledgeUploadViewProps {
	/** Return to the previous page (the create-knowledge form). */
	onBack: () => void;
	onNext: () => void;
	onFiles?: (files: File[]) => void;
}

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
		spacing: "gap-8 px-8 py-6",
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
	const [dragging, setDragging] = createSignal(false);
	let fileRef: HTMLInputElement | undefined;

	function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		props.onFiles?.(Array.from(files));
	}

	return (
		<div class={C.root()}>
			<header class={C.header()}>
				<button type="button" class={C.backBtn()} onClick={props.onBack}>
					<ArrowLeft class="w-4 h-4" />
					<span>{t("knowledge.createTitle")}</span>
				</button>
			</header>

			<div class={C.body()}>
				<ul class={C.steps()}>
					<li class="step step-primary">{t("knowledge.stepUpload")}</li>
					<li class="step step-primary">{t("knowledge.stepSettings")}</li>
					<li class="step">{t("knowledge.stepPreview")}</li>
					<li class="step">{t("knowledge.stepProcess")}</li>
				</ul>

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
			</div>

			<footer class={C.footer()}>
				<button type="button" class="btn btn-primary" onClick={props.onNext}>
					{t("knowledge.next")}
				</button>
			</footer>
		</div>
	);
};

export default KnowledgeUploadView;
