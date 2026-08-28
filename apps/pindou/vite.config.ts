import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    fs: {
      allow: [
        '/Users/wangyong/yong/jinrishan',
        '/Users/wangyong/yong/assistant-web/apps/minecraft/output',
      ],
    },
  },
})
