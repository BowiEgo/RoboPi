/**
 * Plugin kernel — configuration schemas.
 *
 * A dependency-free subset of the Standard Schema interface
 * (https://standard-schema.dev), so any full validator (zod, typebox,
 * schemastery, ...) can be adapted with a three-line wrapper later.
 *
 * A `Schema<T>` describes how to validate a plugin's config before its entry
 * function runs. Each schema also exposes `describe()` — a serializable
 * description the renderer uses to auto-generate a settings form (the
 * schema-form part of the UI plugin framework).
 */

/** One validation failure, addressed by a property path. */
export interface SchemaIssue {
	/** Property path from the config root, e.g. `["provider", "model"]`. */
	path: string[];
	/** Human-readable failure message. */
	message: string;
}

/** Result of a validation: either the validated value or the issues. */
export type SchemaResult<T> = { value: T } | { issues: SchemaIssue[] };

/**
 * A serializable description of a schema, shippable over the wire. The
 * renderer renders a form from this; the host validates with the live schema.
 */
export type SerializableSchema =
	| { type: "string" }
	| { type: "number" }
	| { type: "boolean" }
	| { type: "passthrough" }
	| { type: "optional"; inner: SerializableSchema }
	| { type: "object"; fields: Record<string, SerializableSchema> };

/** Minimal standard-schema-compatible validator. */
export interface Schema<T = unknown> {
	validate(value: unknown): SchemaResult<T>;
	/** Serializable description for auto-generated forms. */
	describe(): SerializableSchema;
}

/** Thrown when plugin config fails schema validation. */
export class ValidationError extends TypeError {
	readonly issues: SchemaIssue[];

	constructor(issues: SchemaIssue[]) {
		super(
			`invalid config:\n` +
				issues
					.map((issue) => {
						const at = issue.path.length ? ` (at ${issue.path.join(".")})` : "";
						return `  - ${issue.message}${at}`;
					})
					.join("\n"),
		);
		this.issues = issues;
		this.name = "ValidationError";
	}
}

/** Accept any value unchanged. Useful for plugins without a config schema. */
export function passthrough<T = unknown>(): Schema<T> {
	return {
		validate(value: unknown): SchemaResult<T> {
			return { value: value as T };
		},
		describe(): SerializableSchema {
			return { type: "passthrough" };
		},
	};
}

/** Validate a string. */
export function string(): Schema<string> {
	return {
		validate(value: unknown): SchemaResult<string> {
			return typeof value === "string" ? { value } : { issues: [{ path: [], message: "expected a string" }] };
		},
		describe(): SerializableSchema {
			return { type: "string" };
		},
	};
}

/** Validate a finite number. */
export function number(): Schema<number> {
	return {
		validate(value: unknown): SchemaResult<number> {
			return typeof value === "number" && Number.isFinite(value)
				? { value }
				: { issues: [{ path: [], message: "expected a finite number" }] };
		},
		describe(): SerializableSchema {
			return { type: "number" };
		},
	};
}

/** Validate a boolean. */
export function boolean(): Schema<boolean> {
	return {
		validate(value: unknown): SchemaResult<boolean> {
			return typeof value === "boolean" ? { value } : { issues: [{ path: [], message: "expected a boolean" }] };
		},
		describe(): SerializableSchema {
			return { type: "boolean" };
		},
	};
}

/**
 * Accept `undefined` without validating; validate anything else with `schema`.
 * Use as the field schema for optional config keys.
 */
export function optional<T>(schema: Schema<T>): Schema<T | undefined> {
	return {
		validate(value: unknown): SchemaResult<T | undefined> {
			if (value === undefined) return { value: undefined };
			return schema.validate(value);
		},
		describe(): SerializableSchema {
			return { type: "optional", inner: schema.describe() };
		},
	};
}

/**
 * Validate a plain object field by field, collecting issues with full paths.
 * Unknown keys are ignored; missing keys fail unless wrapped in `optional()`.
 */
export function object<S extends Record<string, Schema<unknown>>>(
	shape: S,
): Schema<{ [K in keyof S]: S[K] extends Schema<infer T> ? T : never }> {
	return {
		validate(value: unknown) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) {
				return { issues: [{ path: [], message: "expected an object" }] };
			}
			const record = value as Record<string, unknown>;
			const result: Record<string, unknown> = {};
			const issues: SchemaIssue[] = [];
			for (const [key, sub] of Object.entries(shape)) {
				const subResult = sub.validate(record[key]);
				if ("issues" in subResult) {
					for (const issue of subResult.issues) {
						issues.push({ path: [key, ...issue.path], message: issue.message });
					}
				} else {
					result[key] = subResult.value;
				}
			}
			if (issues.length) return { issues };
			return { value: result as { [K in keyof S]: S[K] extends Schema<infer T> ? T : never } };
		},
		describe(): SerializableSchema {
			const fields: Record<string, SerializableSchema> = {};
			for (const [key, sub] of Object.entries(shape)) {
				fields[key] = sub.describe();
			}
			return { type: "object", fields };
		},
	};
}
