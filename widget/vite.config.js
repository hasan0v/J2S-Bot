import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/index.jsx',
      name: 'J2SChatWidget',
      fileName: () => 'chat-widget.js',
      formats: ['iife'],
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'chat-widget.[ext]',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: false },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
