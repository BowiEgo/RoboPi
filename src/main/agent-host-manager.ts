/**
 * Agent Host Manager
 *
 * Manages the Agent Host child-process lifecycle from the main process:
 * - Spawns the ESM agent-host.mjs via spawn()
 * - Bridges messages between the renderer and the Agent Host
 * - Handles child-process errors
 */

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { app, BrowserWindow } from "electron";

import {
	type AgentMessage,
	AgentMessageType,
	isValidMessageType,
} from "../shared/agent-types.ts";

export type AgentMessageHandler = (msg: AgentMessage) => void;

class AgentHostManager {
	private child: ChildProcess | null = null;
	private handlers = new Set<AgentMessageHandler>();
	private messageQueue: AgentMessage[] = [];
	private isReady = false;
	private _availableModels: string[] = [];
	private _providerList: { id: string; name: string }[] = [];

	getAvailableModels(): string[] {
		return this._availableModels;
	}

	getProviderList(): { id: string; name: string }[] {
		return this._providerList;
	}

	/** Start the Agent Host child process */
	start(): void {
		if (this.child) {
			console.warn("[AgentHostManager] Agent host is already running");
			return;
		}

		const { command, args } = this.resolveCommand();

		console.log(`[AgentHostManager] Spawning: ${command} ${args.join(" ")}`);

		this.child = spawn(command, args, {
			stdio: ["pipe", "pipe", "pipe", "ipc"],
			env: {
				...process.env,
				PI_AGENT_MODEL: process.env.PI_AGENT_MODEL ?? "pi-agent/v1",
			},
		});

		this.child.on("message", (raw: unknown) => {
			const msg = raw as AgentMessage;
			if (!msg?.type || !isValidMessageType(msg.type)) return;

			console.log(`[AgentHostManager] ← ${msg.type}`);

			if (msg.type === AgentMessageType.AgentReady) {
				this.isReady = true;
				const p = msg.payload as Record<string, unknown>;
				this._availableModels = (p.availableModels as string[]) ?? [];
				this._providerList = (p.providerList as { id: string; name: string }[]) ?? [];
				this.flushQueue();
			}

			// Forward to all registered handlers (usually the renderer)
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

	/** Send a message to the Agent Host */
	send(msg: AgentMessage): void {
		if (!this.child || !this.isReady) {
			// Queue until ready, then flush
			this.messageQueue.push(msg);
			return;
		}

		console.log(`[AgentHostManager] → ${msg.type}`);
		this.child.send(msg);
	}

	/** Register a message handler (renderer→agent bridge) */
	onMessage(handler: AgentMessageHandler): () => void {
		this.handlers.add(handler);
		return () => this.handlers.delete(handler);
	}

	/** Shut down the Agent Host */
	async shutdown(): Promise<void> {
		const child = this.child;
		if (!child) return;

		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				if (this.child) {
					this.child.kill("SIGKILL");
				}
				resolve();
			}, 3000);

			child.once("exit", () => {
				clearTimeout(timeout);
				this.child = null;
				this.isReady = false;
				resolve();
			});

			child.send({
				id: "shutdown",
				type: AgentMessageType.AgentShutdown,
				payload: {},
			} as AgentMessage);
		});
	}

	/** Whether the Agent Host is ready */
	get ready(): boolean {
		return this.isReady;
	}

	/**
	 * Resolve the Agent Host launch command.
	 *
	 * Dev: run TS source directly via Node's native --experimental-strip-types
	 * Prod: run the pre-built agent-host.mjs (ESM)
	 */
	private resolveCommand(): { command: string; args: string[] } {
		// Dev: run TS source directly via --experimental-strip-types
		// Native ESM path, fully compatible with ESM-only packages like pi-coding-agent
		const tsSourcePath = join(__dirname, "../../src/backend/agent/index.ts");
		if (existsSync(tsSourcePath)) {
			return {
				command: process.execPath,
				args: ["--no-warnings", "--experimental-strip-types", tsSourcePath],
			};
		}

		// Prod: run the compiled ESM bundle
		const mjsPath = join(__dirname, "agent-host.mjs");
		if (existsSync(mjsPath)) {
			return {
				command: process.execPath,
				args: [mjsPath],
			};
		}

		throw new Error(
			`[AgentHostManager] Cannot find agent-host entry. ` +
				`Tried: ${tsSourcePath}, ${mjsPath}`,
		);
	}

	private flushQueue(): void {
		const queue = this.messageQueue;
		this.messageQueue = [];
		for (const msg of queue) {
			this.send(msg);
		}
	}
}

// Singleton
export const agentHostManager = new AgentHostManager();

/**
 * Initialize the Agent Host (called in app.whenReady)
 * and register IPC handlers for renderer communication
 */
export function setupAgentHost(ipcMain: Electron.IpcMain): void {
	// Spawn the agent child process
	agentHostManager.start();

	// Bridge: renderer → Agent Host
	ipcMain.on("agent:send", (_event, msg: AgentMessage) => {
		agentHostManager.send(msg);
	});

	// Bridge: Agent Host → renderer
	agentHostManager.onMessage((msg) => {
		for (const win of BrowserWindow.getAllWindows()) {
			if (!win.isDestroyed()) {
				win.webContents.send("agent:message", msg);
			}
		}
	});

	// Shut down the agent on app quit
	app.on("before-quit", async () => {
		await agentHostManager.shutdown();
	});
}
