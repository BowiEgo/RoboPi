/**
 * Agent Host — 入口（原生 ESM 集成 Pi Agent SDK）
 *
 * 作为独立 Node.js 进程运行，通过 IPC 与 Electron 主进程通信。
 * 使用 spawn() + 原生 ESM import 加载 pi-coding-agent SDK。
 */

import {
  type AgentSession,
  createAgentSession,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

import type { AgentMessage } from "../shared/agent-types";

// ── 状态 ──

let session: AgentSession | null = null;
let unsubscribe: (() => void) | null = null;

// Agent 配置缓存（用于响应 renderer 查询）
let agentModel: string | undefined;
let agentThinkingLevel: string | undefined;
let agentAvailableModels: string[] = [];

// ── IPC ──

function send(msg: AgentMessage): void {
  if (process.send) {
    process.send(msg);
  }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── 初始化 Pi Agent Session ──

async function initAgent(): Promise<void> {
  console.log("[AgentHost] Initializing Pi Agent SDK...");

  // 1. 创建 ModelRuntime（管理认证和模型）
  const modelRuntime = await ModelRuntime.create();

  // 设置 API key（优先使用环境变量）
  if (process.env.ANTHROPIC_API_KEY) {
    modelRuntime.setRuntimeApiKey("anthropic", process.env.ANTHROPIC_API_KEY);
  }
  if (process.env.OPENAI_API_KEY) {
    modelRuntime.setRuntimeApiKey("openai", process.env.OPENAI_API_KEY);
  }

  // 2. 查找可用模型
  const available = await modelRuntime.getAvailable();
  if (available.length === 0) {
    console.warn(
      "[AgentHost] No authenticated models available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
    );
  } else {
    console.log(
      `[AgentHost] Available models: ${available.map((m) => m.id).join(", ")}`,
    );
  }

  // 3. 创建 Session
  const result = await createAgentSession({
    modelRuntime,
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory({
      compaction: { enabled: false },
      retry: { enabled: false },
    }),
    tools: ["read", "bash", "edit", "write"],
    thinkingLevel:
      (process.env.PI_THINKING_LEVEL as
        | "off"
        | "minimal"
        | "low"
        | "medium"
        | "high"
        | "xhigh"
        | "max") ?? "medium",
  });

  session = result.session;

  // 缓存配置以响应 renderer 查询
  agentModel = session.model?.id;
  agentThinkingLevel = process.env.PI_THINKING_LEVEL ?? "medium";
  agentAvailableModels = available.map((m) => m.id);

  // 4. 订阅 SDK 事件 → 转发 IPC
  unsubscribe = session.subscribe((event) => {
    switch (event.type) {
      case "message_update": {
        const { assistantMessageEvent } = event;

        if (assistantMessageEvent.type === "text_delta") {
          send({
            id: uid(),
            type: "chat:chunk",
            payload: {
              sessionId: "",
              delta: assistantMessageEvent.delta,
              kind: "content",
            },
          });
        }

        if (assistantMessageEvent.type === "thinking_delta") {
          send({
            id: uid(),
            type: "thinking:update",
            payload: {
              sessionId: "",
              text: assistantMessageEvent.delta,
            },
          });
        }
        break;
      }

      case "tool_execution_start": {
        console.log(`[AgentHost] Tool: ${event.toolName}`);
        break;
      }

      case "tool_execution_end": {
        console.log(
          `[AgentHost] Tool result: ${event.isError ? "error" : "ok"}`,
        );
        break;
      }

      case "agent_end": {
        const newMessages = event.messages;
        const lastAssistant = [...newMessages]
          .reverse()
          .find((m) => m.role === "assistant");

        let content = "";
        let thinking = "";

        if (lastAssistant) {
          for (const block of lastAssistant.content) {
            if (block.type === "text") {
              content += block.text;
            } else if (block.type === "thinking") {
              thinking += block.thinking;
            }
          }
        }

        send({
          id: uid(),
          type: "chat:done",
          payload: {
            sessionId: "",
            content,
            thinking: thinking || undefined,
            usage: lastAssistant?.usage
              ? {
                  promptTokens: lastAssistant.usage.input,
                  completionTokens: lastAssistant.usage.output,
                }
              : undefined,
          },
        });
        break;
      }
    }
  });

  console.log(
    `[AgentHost] Pi Agent session ready (model: ${session.model?.id ?? "auto"})`,
  );
}

// ── 消息处理 ──

process.on("message", (raw: unknown) => {
  const msg = raw as AgentMessage;
  if (!msg?.type) {
    console.warn("[AgentHost] Received invalid message:", raw);
    return;
  }

  console.log(`[AgentHost] ← ${msg.type} (${msg.id})`);

  switch (msg.type) {
    case "chat:send": {
      const payload = msg.payload as { content: string; sessionId: string };
      if (!payload?.content) {
        send({
          id: msg.id,
          type: "chat:error",
          payload: {
            sessionId: payload?.sessionId ?? "",
            code: "INVALID_PAYLOAD",
            message: "Missing content",
          },
        });
        return;
      }

      if (!session) {
        send({
          id: msg.id,
          type: "chat:error",
          payload: {
            sessionId: payload.sessionId ?? "",
            code: "NOT_READY",
            message: "Agent session not initialized yet",
          },
        });
        return;
      }

      // 异步发送 prompt（不阻塞消息循环）
      session.prompt(payload.content).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        send({
          id: uid(),
          type: "chat:error",
          payload: {
            sessionId: payload.sessionId ?? "",
            code: "AGENT_ERROR",
            message,
          },
        });
        console.error("[AgentHost] prompt error:", err);
      });
      break;
    }

    case "chat:cancel": {
      if (session) {
        session.abort().catch((err) => {
          console.error("[AgentHost] abort error:", err);
        });
      }
      break;
    }

    case "agent:status": {
      send({
        id: msg.id,
        type: "agent:status",
        payload: {
          status: session?.isStreaming ? "responding" : "idle",
          model: agentModel,
          thinkingLevel: agentThinkingLevel,
        },
      });
      break;
    }

    case "agent:config": {
      send({
        id: msg.id,
        type: "agent:config",
        payload: {
          model: agentModel,
          thinkingLevel: agentThinkingLevel,
          availableModels: agentAvailableModels,
          status: session?.isStreaming ? "responding" : "idle",
        },
      });
      break;
    }

    case "agent:shutdown": {
      console.log("[AgentHost] Shutting down...");
      shutdown();
      break;
    }
  }
});

// ── 生命周期 ──

async function startup(): Promise<void> {
  try {
    await initAgent();
    send({
      id: "agent-ready",
      type: "agent:ready",
      payload: {
        pid: process.pid,
        version: "0.2.0",
        model: agentModel,
        thinkingLevel: agentThinkingLevel,
        availableModels: agentAvailableModels,
      },
    });
    console.log(`[AgentHost] Started (PID: ${process.pid})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentHost] Failed to initialize:", message);
    send({
      id: "agent-ready",
      type: "chat:error",
      payload: {
        sessionId: "",
        code: "INIT_ERROR",
        message: `Failed to initialize agent: ${message}`,
      },
    });
  }
}

async function shutdown(): Promise<void> {
  try {
    unsubscribe?.();
    if (session) {
      session.dispose();
      session = null;
    }
  } catch (err) {
    console.error("[AgentHost] Error during shutdown:", err);
  }
  process.exit(0);
}

process.on("SIGTERM", () => {
  console.log("[AgentHost] SIGTERM received");
  shutdown();
});

process.on("SIGINT", () => {
  console.log("[AgentHost] SIGINT received");
  shutdown();
});

// ── 启动 ──

startup();
