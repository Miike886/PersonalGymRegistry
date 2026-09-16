import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({plugins:[react(),VitePWA({registerType:'autoUpdate',manifest:{name:'Gym Session Tracker',short_name:'Gym Tracker',theme_color:'#12151c',background_color:'#12151c',display:'standalone'}})]})
