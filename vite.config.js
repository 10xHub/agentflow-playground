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
      "@hooks": path.resolve(__dirname, "./src/lib/hooks"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@context": path.resolve(__dirname, "./src/lib/context"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@constants": path.resolve(__dirname, "./src/lib/constants"),
      "@api": path.resolve(__dirname, "./src/services/api"),
      "@query": path.resolve(__dirname, "./src/services/query"),
      "@store": path.resolve(__dirname, "./src/services/store"),
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
        "src/lib/agentflow-client.js",
        "src/lib/devtools.js",
        "src/lib/menu-list.js",
        "src/lib/messageContent.js",
        "src/lib/query-client.js",
        "src/lib/settings-utils.js",
        "src/lib/utils.js",
        "src/lib/constants/**/*.js",
        "src/services/api/**/*.js",
        "src/services/query/state.query.js",
        "src/services/query/thread.query.js",
        "src/services/store/slices/**/*.js",
        "src/components/layout/sheets/state/ContextMessage.jsx",
        "src/components/layout/sheets/state/useFormData.js",
        "src/pages/chat/component/full/MessageComponent.jsx",
      ],
      exclude: [
        "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
        "src/setup-tests.js",
        "src/components/ui/**",
        "src/components/magicui/**",
        "src/services/query/message.query.js",
      ],
      thresholds: {
        lines: 60,
        branches: 60,
        functions: 60,
      },
      statements: 30,
    },
  },
  css: {
    devSourcemap: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id
              .toString()
              .split("node_modules/")[1]
              .split("/")[0]
              .toString()
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
