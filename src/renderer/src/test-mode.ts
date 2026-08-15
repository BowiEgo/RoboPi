/**
 * Test message mode — shared UI state.
 *
 * The 🧪 test button (a UI plugin) toggles this; ChatPanel reads it to swap
 * between real messages and the demo/test message set.
 */

import { createSignal } from "solid-js";

export const [isTestMode, setTestMode] = createSignal(false);

export function toggleTestMode(): void {
	setTestMode((v) => !v);
}
