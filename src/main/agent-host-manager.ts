/**
 * Agent Host Manager
 *
 * 在主进程中管理 Agent Host 子进程的生命周期：
 * - 启动 / 关闭 Agent Host
 * - 桥接渲染进程 ↔ Agent Host 的消息
 * - 处理子进程异常
 */

import { fork, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { app } from "electron";
import type { AgentMessage } from "../shared/agent-types";

export type AgentMessageHandler = (msg: AgentMessage) => void;

class AgentHostManager {
  private child: ChildProcess | null = null;
  private handlers = new Set<AgentMessageHandler>();
  private messageQueue: AgentMessage[] = [];
  private isReady = false;

  /** 启动 Agent Host 子进程 */
  start(): void {
    if (this.child) {
      console.warn("[AgentHostManager] Agent host is already running");
      return;
    }

    const scriptPath = join(__dirname, "agent-host.js");

    this.child = fork(scriptPath, [], {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      env: {
        ...process.env,
        PI_AGENT_MODEL: process.env.PI_AGENT_MODEL ?? "pi-agent/v1",
      },
    });

    this.child.on("message", (raw: unknown) => {
      const msg = raw as AgentMessage;
      if (!msg || !msg.type) return;

      console.log(`[AgentHostManager] ← ${msg.type}`);

      if (msg.type === "agent:ready") {
        this.isReady = true;
        this.flushQueue();
      }

      // 转发到所有已注册的 handler（通常是转发给渲染进程）
      for (const handler of this.handlers) {
        handler(msg);
      }
    });

    this.child.on("error", (err) => {
      console.error("[AgentHostManager] Agent host error:", err);
      this.isReady = false;
    });

    this.child.on("exit", (code, signal) => {
      console.log(
        `[AgentHostManager] Agent host exited (code: ${code}, signal: ${signal})`,
      );
      this.child = null;
      this.isReady = false;
    });

    if (this.child.stdout) {
      this.child.stdout.on("data", (data: Buffer) => {
        console.log(`[AgentHost stdout] ${data.toString().trim()}`);
      });
    }

    if (this.child.stderr) {
      this.child.stderr.on("data", (data: Buffer) => {
        console.error(`[AgentHost stderr] ${data.toString().trim()}`);
      });
    }
  }

  /** 发送消息到 Agent Host */
  send(msg: AgentMessage): void {
    if (!this.child || !this.isReady) {
      // 排队，等就绪后发出
      this.messageQueue.push(msg);
      return;
    }

    console.log(`[AgentHostManager] → ${msg.type}`);
    this.child.send(msg);
  }

  /** 注册消息处理器（供 renderer→agent 方向桥接） */
  onMessage(handler: AgentMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** 关闭 Agent Host */
  async shutdown(): Promise<void> {
    if (!this.child) return;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.child) {
          this.child.kill("SIGKILL");
        }
        resolve();
      }, 3000);

      this.child!.once("exit", () => {
        clearTimeout(timeout);
        this.child = null;
        this.isReady = false;
        resolve();
      });

      this.child!.send({
        id: "shutdown",
        type: "agent:shutdown",
        payload: {},
      } as AgentMessage);
    });
  }

  /** 是否就绪 */
  get ready(): boolean {
    return this.isReady;
  }

  private flushQueue(): void {
    const queue = this.messageQueue;
    this.messageQueue = [];
    for (const msg of queue) {
      this.send(msg);
    }
  }
}

// 单例
export const agentHostManager = new AgentHostManager();

/**
 * 初始化 Agent Host（在 app.whenReady 中调用）
 * 并注册 IPC handlers 用于渲染进程通信
 */
export function setupAgentHost(ipcMain: Electron.IpcMain): void {
  // 启动 agent 子进程
  agentHostManager.start();

  // 桥接：渲染进程 → Agent Host
  ipcMain.on("agent:send", (_event, msg: AgentMessage) => {
    agentHostManager.send(msg);
  });

  // 桥接：Agent Host → 渲染进程
  agentHostManager.onMessage((msg) => {
    // 通过所有窗口的 webContents 发送
    const { BrowserWindow } = require("electron");
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send("agent:message", msg);
      }
    }
  });

  // 应用退出时关闭 agent
  app.on("before-quit", async () => {
    await agentHostManager.shutdown();
  });
}
