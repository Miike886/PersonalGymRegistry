import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
const proxy = { '/api': { target:process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin:true, rewrite:(path:string)=>path.replace(/^\/api/, '') } }
export default defineConfig({
  server:{proxy}, preview:{proxy},
  plugins:[react(),VitePWA({
    registerType:'autoUpdate',
    workbox:{navigateFallbackDenylist:[/^\/api(?:\/|$)/]},
    manifest:{name:'Gym Session Tracker',short_name:'Gym Tracker',theme_color:'#0c0e0b',background_color:'#0c0e0b',display:'standalone'},
  })],
})
