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
      // Proxy for yunwu.ai services
      '/proxy/yunwu': {
        target: 'http://yunwu.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/yunwu/, ''),
      },
      // Proxy for kie.ai services
      '/proxy/kie': {
        target: 'https://api.kie.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/kie/, ''),
      },
      // Proxy for bookworm (api.apimart.ai)
      '/proxy/bookworm': {
        target: 'https://api.apimart.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/bookworm/, ''),
      },
    }
  }
})
