import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'electron-vite'
import solid from 'vite-plugin-solid'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [tailwindcss(), solid(), tsconfigPaths()]
  }
})
