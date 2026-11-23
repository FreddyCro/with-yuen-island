import { defineConfig } from 'vite';

export default defineConfig({
  // 相對路徑：同一份 dist/ 可放 GitHub Pages 根目錄，也可放 withyuen.com 的任一子目錄
  base: './',
  build: { target: 'es2022' },
});
