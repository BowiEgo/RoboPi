import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    solid({
      // 测试环境中不需要 HMR / solid-refresh
      hot: false
    })
  ],
  resolve: {
    alias: {
      '@renderer': 'src/renderer/src'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
})
