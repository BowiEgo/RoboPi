/**
 * UI plugin framework — shared types.
 *
 * Plugins contribute UI declaratively: they declare which SLOT to mount into
 * and which built-in VIEW to use. The renderer never executes plugin code —
 * it only resolves the view string against a static registry of built-in
 * components (scheme A). Plugin config forms come later via a serializable
 * schema (scheme B, the schema-form part).
 */

import type { SerializableSchema } from "./plugin/schema.ts";

/** UI insertion points across the renderer. */
export type UISlot =
	| "chat:sidebar" //  侧边栏（会话列表下方）
	| "chat:header" //   ChatPanel 标题栏操作区
	| "chat:composer" //  Composer 工具栏
	| "chat:message-menu" // 消息操作菜单
	| "chat:status" //    底部状态栏
	| "settings:general" // 设置 → 通用
	| "settings:models" // 设置 → 模型
	| "settings:plugins"; // 设置 → 插件

/** A plugin's declarative UI contribution. */
export interface UIExtension {
	/** Slots this extension mounts into. */
	slots: UISlot[];
	/** Built-in view key, resolved against the renderer's static registry. */
	view: string;
	/** Initial config passed to the built-in view component. */
	viewConfig?: unknown;
	/** Navigation title, used when the extension renders as a settings section. */
	title?: string;
}

/** A UI extension plus its owning plugin id, sent to the renderer. */
export interface UIExtensionDescriptor {
	pluginId: string;
	slots: UISlot[];
	view: string;
	viewConfig?: unknown;
	/** Navigation title for settings sections. */
	title?: string;
	/** Serialized Config schema (from manifest.Config.describe()), for auto forms. */
	settingsSchema?: SerializableSchema;
	/** Current config value, used to initialize the settings form. */
	settingsValue?: unknown;
}
