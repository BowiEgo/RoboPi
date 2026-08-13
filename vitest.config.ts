import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tailwindcss(),
		solid({
			// 测试环境中不需要 HMR / solid-refresh
			hot: false,
		}),
	],
	resolve: {
		alias: {
			"@renderer": resolve("src/renderer/src"),
			"@": resolve("src/renderer/src"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: [],
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
	},
});
