// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json']

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions,
  },
})
