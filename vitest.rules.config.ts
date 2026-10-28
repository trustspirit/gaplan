// vitest.rules.config.ts — Firestore 보안 규칙 테스트. 에뮬레이터가 필요해서 기본
// vitest.config.ts와 따로 둔다: `npm run test:rules`가 에뮬레이터를 띄우고 이 설정으로 돌린다.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['rules-tests/**/*.test.ts'],
    // 테스트 파일끼리 같은 에뮬레이터 DB를 지우고 채우므로 한 번에 하나씩 돈다.
    fileParallelism: false,
  },
})
