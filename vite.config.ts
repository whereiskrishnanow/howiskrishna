import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // relative asset URLs: works at howiskrishna.com and at whereiskrishnanow.github.io/howiskrishna/
  base: './',
  plugins: [react()],
  server: { port: 5175, strictPort: true },
})
