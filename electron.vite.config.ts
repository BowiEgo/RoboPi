import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'electron-vite'
import solid from 'vite-plugin-solid'
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'agent-host': resolve(__dirname, 'src/agent-host/index.ts'),
        },
        external: (id: string) => {
          // Keep ESM-only pi packages and their transitive deps external
          // so that dynamic import() resolves them correctly at runtime
          if (
            id.startsWith('@earendil-works/') ||
            id.startsWith('@anthropic-ai/') ||
            id.startsWith('@google/') ||
            id.startsWith('openai') ||
            id === 'typebox' ||
            id.startsWith('@sinclair/typebox')
          ) {
            return true;
          }
          return false;
        },
      },
    },
  },
  preload: {},
  renderer: {
    plugins: [tailwindcss(), solid(), tsconfigPaths()]
  }
})
