import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE 用于子路径部署（如 GitHub Pages 的 /henu-game/），本地保持根路径。
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
