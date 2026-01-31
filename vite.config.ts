import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 这里填你本地后端的地址
        changeOrigin: true,
        // 这一行不用写，因为你的后端接口本来就是 /api 开头的
        // rewrite: (path) => path.replace(/^\/api/, '') 
      }
    }
  }
})
