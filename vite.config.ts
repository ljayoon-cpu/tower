import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 로컬 dev/build 는 상대경로('./'). GitHub Pages 빌드는 BASE_PATH=/tower/ 를 넘겨 서브경로에 맞춘다.
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'sfx/*.wav', 'art/enemies/*.png'],
      manifest: {
        lang: 'ko',
        name: '머지 타워디펜스',
        short_name: 'MergeTD',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#0f1020',
        theme_color: '#0f1020',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
