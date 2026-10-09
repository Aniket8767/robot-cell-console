import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Builds ONE file, dist/pick-panel.js, that registers the <pick-panel> custom element.
export default defineConfig({
  plugins: [vue()], // files named *.ce.vue are compiled as custom elements
  define: { 'process.env.NODE_ENV': JSON.stringify('production') }, // not replaced automatically in lib mode
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: { entry: 'src/main.js', formats: ['es'], fileName: () => 'pick-panel.js' },
  },
});
