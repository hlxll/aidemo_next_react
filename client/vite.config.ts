import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // 打包时所有静态资源统一挂到 /api/ 下（产物引用 /api/assets/xxx.js）
  // 开发时保持 /，这样 npm run dev 还是 http://localhost:5174/
  base: command === 'build' ? '/api/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
  },
}))
