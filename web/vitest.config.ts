import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Nur der Kern wird getestet. Er braucht weder Nuxt noch eine DOM-Umgebung
    // - genau das ist der Punkt an ihm.
    include: ['core/**/*.test.ts'],
    environment: 'node',
  },
})
