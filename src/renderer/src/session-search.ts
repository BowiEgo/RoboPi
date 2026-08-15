/**
 * Session list search — shared UI state.
 *
 * The Search box above SessionList writes this; SessionList reads it to
 * filter session rows by title (and last-message preview).
 */

import { createSignal } from "solid-js";

export const [sessionSearchQuery, setSessionSearchQuery] = createSignal("");
