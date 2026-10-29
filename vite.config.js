import path from "path"

import react from "@vitejs/plugin-react-swc"
// import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // we will follow shardcn documentation
      // as its use @/components/ui/<com>
      // '@components': path.resolve(__dirname, './src/components'),
      // '@shardcn': path.resolve(__dirname, './src/components/ui'),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@constants": path.resolve(__dirname, "./src/lib/constants"),
    },
  },
  //  This setup will run ESLint on every file change during development.
  //  For performance, you might want to consider running ESLint
  //  separately or on pre-commit hooks.
  esbuild: {
    // jsxInject: `import React from 'react'`,
  },
  lintOnSave: true, // Enable linting during development
  eslint: {
    // ESLint options, if any
    fix: true, // Automatically fix ESLint errors on save
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "src/setup-tests.js",
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/coverage/**",
      "**/dist/**",
      "**/public/**",
      "**/src/components/ui/**",
      "**/src/components/magicui/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["html", "json-summary", "text", "json"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: [
        "src/lib/tenxgraph-client.js",
        "src/lib/analytics.js",
        "src/lib/messageContent.js",
        "src/lib/settings-utils.js",
        "src/lib/storage-migration.js",
        "src/lib/utils.js",
        "src/lib/constants/**/*.js",
      ],
      exclude: [
        "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
        "src/setup-tests.js",
        "src/components/ui/**",
        "src/components/magicui/**",
      ],
      thresholds: {
        lines: 60,
        branches: 60,
        functions: 60,
      },
      statements: 30,
    },
  },
  server: {
    fs: {
      // 10xgraph-client is linked via file:../agentflow-client until rc.2 is published
      allow: [".", "../agentflow-client"],
    },
  },
  css: {
    devSourcemap: false,
  },
  build: {
    chunkSizeWarningLimit: 500,
  },
})
