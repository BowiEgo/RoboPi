/**
 * Response helpers — uniform error/success replies to the main process.
 */

import { type AgentMessage, AgentMessageType } from "../../shared/agent-types.ts";
import { ErrorCode } from "./constants.ts";

export function respondError(msgId: string, code: string, message: string): void {
	postToHost({
		id: msgId,
		type: AgentMessageType.AgentError,
		payload: { code, message },
	});
}

export function respondNotReady(msgId: string): void {
	respondError(msgId, ErrorCode.NOT_READY, "Agent host is still initializing");
}

function postToHost(msg: AgentMessage): void {
	if (process.send) process.send(msg);
}
