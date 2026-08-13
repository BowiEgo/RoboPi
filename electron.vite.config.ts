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
        },
      },
    },
  },
  preload: {},
  renderer: {
    plugins: [tailwindcss(), solid(), tsconfigPaths()]
  }
})
