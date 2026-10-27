import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // shiki 的语法与主题文件很多，拆出来避免主 chunk 过大
    chunkSizeWarningLimit: 1200,
  },
})
