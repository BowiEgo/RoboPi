/**
 * UI plugin framework — renderer-local extension store.
 *
 * Two sources, merged in order:
 *   1. LOCAL — renderer built-in UI plugins (theme, pure-UI features). These
 *      live entirely in the renderer and have no backend counterpart.
 *   2. remote — backend plugins contributing UI, shipped via ui:manifest.
 */

import { createMemo, createSignal } from "solid-js";

import type { UIExtensionDescriptor } from "@shared/agent-types";

/** Renderer built-in UI plugins. Add a local plugin by appending here. */
const LOCAL_EXTENSIONS: UIExtensionDescriptor[] = [
	{ pluginId: "core:theme", slots: ["settings:section"], view: "theme-switcher" },
];

/** Backend plugins' UI contributions, set from ui:manifest. */
const [remoteExtensions, setRemote] = createSignal<UIExtensionDescriptor[]>([]);

/** All UI extensions, local first then remote. */
export const uiExtensions = createMemo(() => [...LOCAL_EXTENSIONS, ...remoteExtensions()]);

/** Update the remote (backend) extensions from a ui:manifest payload. */
export function setRemoteExtensions(extensions: UIExtensionDescriptor[]): void {
	setRemote(extensions);
}
