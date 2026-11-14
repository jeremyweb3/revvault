import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        landing: 'landing.html',
        app: 'index.html'
      }
    }
  }
})
