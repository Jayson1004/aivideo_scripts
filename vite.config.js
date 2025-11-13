import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
    hmr: false,
    open: false,
    proxy: {
      '/v1beta': {
        target: 'http://yunwu.ai',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://yunwu.ai',
        changeOrigin: true,
      },
    }
  }
})
