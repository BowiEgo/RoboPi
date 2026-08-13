import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

/**
 * Standalone Vite config for running the RoboPi renderer as a plain web app
 * (no Electron). Used by `npm run dev:web`.
 *
 * - Serves src/renderer with HMR.
 * - Resolves the same `@/` and `@shared/` aliases as tsconfig.web.json.
 * - Proxies /agent and /api to the RoboPi web server (PORT, default 3000),
 *   which bridges to the Agent Host child process.
 */

const projectRoot = process.cwd();
const proxyTarget = `http://localhost:${process.env.PORT ?? 3000}`;
const vitePort = Number(process.env.VITE_PORT ?? 5173);

export default defineConfig({
	root: resolve(projectRoot, "src/renderer"),
	plugins: [tailwindcss(), solid()],
	resolve: {
		alias: {
			"@": resolve(projectRoot, "src/renderer/src"),
			"@shared": resolve(projectRoot, "src/shared"),
		},
	},
	server: {
		host: "127.0.0.1",
		port: vitePort,
		proxy: {
			"/agent": { target: proxyTarget, changeOrigin: true },
			"/api": { target: proxyTarget, changeOrigin: true },
		},
	},
});
