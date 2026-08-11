import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only the core is tested. It needs neither Nuxt nor a DOM environment —
    // that is precisely the point of it.
    include: ['core/**/*.test.ts'],
    environment: 'node',
  },
})
