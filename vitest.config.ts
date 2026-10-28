// vitest.config.ts
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json']

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // 규칙 테스트는 에뮬레이터가 필요하다 — `npm run test:rules`(vitest.rules.config.ts)가 따로 돌린다.
    exclude: [...configDefaults.exclude, 'rules-tests/**'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions,
  },
})
