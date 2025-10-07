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
    setupFiles: "src/setupTests.js",
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["html", "json-summary", "text", "json"],
      reportsDirectory: "./coverage", // Keep only one directory specification
      subdir: "coverage", // Optional, if you want a subdirectory
      reportOnFailure: true,
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
      },
      exclude: ["src/components/ui/**", "src/components/magicui/**"],
      statements: 30,
    },
    exclude: [
      "**/public/**",
      "**/dist/**",
      "**/src/components/ui/**",
      "**/src/components/magicui/**",
    ],
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
