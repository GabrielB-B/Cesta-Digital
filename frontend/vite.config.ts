import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: process.env.UX_LOCAL_HOST ? [process.env.UX_LOCAL_HOST] : [],
  },
})
