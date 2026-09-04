// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json']

// Building without these produces a bundle that crashes on load
// with auth/invalid-api-key, so fail the build instead.
const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, __dirname, 'VITE_')
    const missing = REQUIRED_ENV.filter((key) => !env[key])
    if (missing.length > 0) {
      throw new Error(
        `Missing Firebase env vars (check .env): ${missing.join(', ')}`,
      )
    }
  }
  return config
})

const config = {
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // 로그인 앱과 공개 페이지는 서로 아무것도 공유할 필요가 없다 — 엔트리를
        // 나눠야 공개 방문자가 firebase auth·firestore와 전체 i18n 사전을 받지 않는다.
        main: resolve(__dirname, 'index.html'),
        public: resolve(__dirname, 'public.html'),
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions,
  },
  css: { preprocessorOptions: { scss: { api: 'modern' } } },
  test: {
    exclude: [
      '**/node_modules/**', '**/dist/**', '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/functions/lib/**',
    ],
  },
}
