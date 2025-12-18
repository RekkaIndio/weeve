import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './test/setupTests.ts',
    deps: {
      // Keep fabric inline to avoid pre-bundling; canvas isn't needed with happy-dom
      inline: ['fabric'],
    },
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  optimizeDeps: {
    // Ensure Vite doesn't pre-bundle these modules during dependency optimization
    exclude: ['canvas', 'fabric'],
  },
  ssr: {
    // Prevent ssr externalization from trying to require native bindings
    noExternal: ['fabric', 'canvas'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: '/src' },
      { find: 'canvas', replacement: '/test/mocks/canvas.ts' },
    ],
  },
});
