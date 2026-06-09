// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json']

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions,
  },
  css: { preprocessorOptions: { scss: { api: 'modern' } } },
})
