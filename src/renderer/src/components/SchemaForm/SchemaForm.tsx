/**
 * SchemaForm — renders a form from a serialized plugin schema.
 *
 * The host ships a SerializableSchema (from Schema.describe()); this
 * component renders an editable control per field. Value flows up via
 * onChange as a plain object; the host validates against the live schema.
 */

import { type Component, For } from "solid-js";

import type { SerializableSchema } from "@shared/plugin/schema";

import { cstyle } from "@/utils/cstyle";

export interface SchemaFormProps {
	schema: SerializableSchema;
	value: unknown;
	onChange: (value: unknown) => void;
}

const C = {
	root: cstyle({ display: "flex flex-col", spacing: "gap-3" }),
	field: cstyle({ display: "flex items-center", spacing: "gap-3" }),
	label: cstyle({ text: "text-sm", color: "text-base-content/70" }),
	checkbox: cstyle({ display: "toggle toggle-sm" }),
	input: cstyle({ display: "input input-bordered input-sm", sizing: "w-40" }),
};

const SchemaForm: Component<SchemaFormProps> = (props) => {
	const { schema, value, onChange } = props;

	if (schema.type === "boolean") {
		return (
			<input
				type="checkbox"
				class={C.checkbox()}
				checked={Boolean(value)}
				onChange={(e) => onChange(e.currentTarget.checked)}
			/>
		);
	}

	if (schema.type === "string") {
		return (
			<input
				type="text"
				class={C.input()}
				value={String(value ?? "")}
				onInput={(e) => onChange(e.currentTarget.value)}
			/>
		);
	}

	if (schema.type === "number") {
		return (
			<input
				type="number"
				class={C.input()}
				value={Number(value ?? 0)}
				onInput={(e) => onChange(Number(e.currentTarget.value))}
			/>
		);
	}

	if (schema.type === "optional") {
		return <SchemaForm schema={schema.inner} value={value} onChange={onChange} />;
	}

	if (schema.type === "object") {
		const record = (value ?? {}) as Record<string, unknown>;
		return (
			<div class={C.root()}>
				<For each={Object.entries(schema.fields)}>
					{([key, sub]) => (
						<div class={C.field()}>
							<span class={C.label()}>{key}</span>
							<SchemaForm
								schema={sub}
								value={record[key]}
								onChange={(v) => onChange({ ...record, [key]: v })}
							/>
						</div>
					)}
				</For>
			</div>
		);
	}

	// passthrough or unknown: nothing editable.
	return null;
};

export default SchemaForm;
