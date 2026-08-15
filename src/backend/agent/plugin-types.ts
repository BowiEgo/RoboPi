/**
 * Core plugin type declarations.
 *
 * Defines the event map and service map used by the Agent Host's plugin
 * registry. Events are the inbound protocol messages (one `ipc:<type>` event
 * per AgentMessageType) plus an internal `transport:message` bridge event.
 *
 * These are passed explicitly to `PluginRegistry<CoreEvents, CoreServices>`
 * rather than via declaration merging, to keep the core wiring local and
 * explicit. Declaration merging can layer on top later for external plugins.
 */

import type { AgentMessage } from "../../shared/agent-types.ts";
import type { AgentHost } from "./agent-host.ts";
import type { SessionHost } from "./session/session-host.ts";

/** Inbound protocol events — one `ipc:<type>` per AgentMessageType. */
export type CoreEvents = {
	"transport:message": (msg: AgentMessage) => void;
} & {
	[key: `ipc:${string}`]: (msg: AgentMessage) => void;
};

/** Services provided by the core plugins. */
export interface CoreServices {
	model: AgentHost;
	session: SessionHost;
}
