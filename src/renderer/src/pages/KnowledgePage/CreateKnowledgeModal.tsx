import { FileText, Image, Table } from "lucide-solid";
import { type Component, createSignal } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import Modal from "@/components/Modal/Modal";

import { cstyle } from "@/utils/cstyle";

export type KnowledgeCreateType = "document" | "sheet" | "image";
export type ImportType = "local" | "custom";

export interface KnowledgeCreateData {
	type: KnowledgeCreateType;
	name: string;
	description: string;
	importType: ImportType;
}

interface CreateKnowledgeModalProps {
	open: boolean;
	onClose: () => void;
	onCreate?: (data: KnowledgeCreateData) => void;
	onCreateImport?: (data: KnowledgeCreateData) => void;
}

const C = {
	typeRow: cstyle({ display: "flex", spacing: "gap-2" }),
	typeBtn: cstyle({
		display: "btn btn-sm flex-1",
		spacing: "gap-1.5",
		variants: {
			active: { true: "btn-primary", false: "btn-outline" },
		},
	}),
	field: cstyle({ display: "flex flex-col", spacing: "gap-1.5" }),
	label: cstyle({
		display: "flex items-center",
		text: "text-sm font-medium",
		color: "text-base-content/80",
	}),
	required: cstyle({ text: "text-error" }),
	input: cstyle({
		display: "w-full",
		text: "text-sm",
		interaction: "border rounded-lg outline-none",
		spacing: "px-3 py-2",
		color: "bg-base-100 border-base-300 focus:border-primary/45",
	}),
	counter: cstyle({
		text: "text-xs text-right",
		color: "text-base-content/30",
	}),
	textarea: cstyle({
		display: "w-full resize-none",
		text: "text-sm",
		interaction: "border rounded-lg outline-none",
		spacing: "px-3 py-2",
		sizing: "min-h-24",
		color: "bg-base-100 border-base-300 focus:border-primary/45",
	}),
	importRow: cstyle({ display: "flex", spacing: "gap-2" }),
	importCard: cstyle({
		display: "flex flex-col flex-1",
		spacing: "gap-1 px-3 py-2.5",
		text: "text-sm text-left",
		interaction: "rounded-lg border transition-colors cursor-pointer",
		color: "border-base-300 bg-base-100 hover:border-base-content/30",
		variants: {
			active: { true: "border-primary bg-primary/5" },
		},
	}),
	importTitle: cstyle({ text: "font-medium", color: "text-base-content" }),
	importHint: cstyle({ text: "text-xs", color: "text-base-content/40" }),
	actions: cstyle({
		display: "flex items-center justify-end",
		spacing: "gap-2",
	}),
};

const CreateKnowledgeModal: Component<CreateKnowledgeModalProps> = (props) => {
	const { t } = useLocale();
	const [type, setType] = createSignal<KnowledgeCreateType>("document");
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [importType, setImportType] = createSignal<ImportType>("local");

	const data = (): KnowledgeCreateData => ({
		type: type(),
		name: name().trim(),
		description: description().trim(),
		importType: importType(),
	});

	function close() {
		props.onClose();
	}

	return (
		<Modal open={props.open} onClose={close} title={t("knowledge.createTitle")} width="40rem" maxWidth="40rem">
			{/* Format selector */}
			<div class={C.typeRow()}>
				<button type="button" class={C.typeBtn({ active: type() === "document" })} onClick={() => setType("document")}>
					<FileText class="w-4 h-4" />
					<span>{t("knowledge.typeText")}</span>
				</button>
				<button type="button" class={C.typeBtn({ active: type() === "sheet" })} onClick={() => setType("sheet")}>
					<Table class="w-4 h-4" />
					<span>{t("knowledge.typeSheet")}</span>
				</button>
				<button type="button" class={C.typeBtn({ active: type() === "image" })} onClick={() => setType("image")}>
					<Image class="w-4 h-4" />
					<span>{t("knowledge.typeImage")}</span>
				</button>
			</div>

			{/* Name */}
			<div class={C.field()}>
				<span class={C.label()}>
					{t("knowledge.nameLabel")}
					<span class={C.required()}> *</span>
				</span>
				<input
					type="text"
					class={C.input()}
					placeholder={t("knowledge.namePlaceholder")}
					value={name()}
					maxLength={100}
					onInput={(e) => setName(e.currentTarget.value)}
				/>
				<span class={C.counter()}>{name().length}/100</span>
			</div>

			{/* Description */}
			<div class={C.field()}>
				<span class={C.label()}>{t("knowledge.descLabel")}</span>
				<textarea
					class={C.textarea()}
					placeholder={t("knowledge.descPlaceholder")}
					value={description()}
					maxLength={2000}
					onInput={(e) => setDescription(e.currentTarget.value)}
				/>
				<span class={C.counter()}>{description().length}/2000</span>
			</div>

			{/* Import type */}
			<div class={C.field()}>
				<span class={C.label()}>{t("knowledge.importType")}</span>
				<div class={C.importRow()}>
					<button
						type="button"
						class={C.importCard({ active: importType() === "local" })}
						onClick={() => setImportType("local")}
					>
						<span class={C.importTitle()}>{t("knowledge.importLocal")}</span>
						<span class={C.importHint()}>{t("knowledge.importLocalHint")}</span>
					</button>
					<button
						type="button"
						class={C.importCard({ active: importType() === "custom" })}
						onClick={() => setImportType("custom")}
					>
						<span class={C.importTitle()}>{t("knowledge.importCustom")}</span>
						<span class={C.importHint()}>{t("knowledge.importCustomHint")}</span>
					</button>
				</div>
			</div>

			{/* Actions */}
			<div class={C.actions()}>
				<button type="button" class="btn btn-ghost" onClick={close}>
					{t("knowledge.cancel")}
				</button>
				<button
					type="button"
					class="btn btn-soft"
					disabled={!name().trim()}
					onClick={() => {
						props.onCreate?.(data());
						close();
					}}
				>
					{t("knowledge.doneCreate")}
				</button>
				<button
					type="button"
					class="btn btn-primary"
					disabled={!name().trim()}
					onClick={() => {
						props.onCreateImport?.(data());
						close();
					}}
				>
					{t("knowledge.createImport")}
				</button>
			</div>
		</Modal>
	);
};

export default CreateKnowledgeModal;
