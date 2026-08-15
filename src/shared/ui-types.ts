/**
 * UI plugin framework — shared types.
 *
 * Plugins contribute UI declaratively: they declare which SLOT to mount into
 * and which built-in VIEW to use. The renderer never executes plugin code —
 * it only resolves the view string against a static registry of built-in
 * components (scheme A). Plugin config forms come later via a serializable
 * schema (scheme B, the schema-form part).
 */

/** UI insertion points across the renderer. */
export type UISlot =
	| "chat:sidebar" //  侧边栏（会话列表下方）
	| "chat:composer" //  Composer 工具栏
	| "chat:message-menu" // 消息操作菜单
	| "chat:status" //    底部状态栏
	| "settings:section"; // 设置面板 section

/** A plugin's declarative UI contribution. */
export interface UIExtension {
	/** Slots this extension mounts into. */
	slots: UISlot[];
	/** Built-in view key, resolved against the renderer's static registry. */
	view: string;
	/** Initial config passed to the built-in view component. */
	viewConfig?: unknown;
}

/** A UI extension plus its owning plugin id, sent to the renderer. */
export interface UIExtensionDescriptor {
	pluginId: string;
	slots: UISlot[];
	view: string;
	viewConfig?: unknown;
}
