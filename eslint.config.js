import config from "@10xscale/eslint-modern"
import globals from "globals"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
  {
    ignores: [
      "**/*.{test,spec}.{js,jsx,ts,tsx}",
      "src/setup-tests.js",
      // The demo agent is a Python project (with its own virtualenv).
      "demo/agent/**",
      // Vendored from the shadcn registry with src/components/ui (the
      // code-block highlighter), kept as published.
      "src/lib/highlighter.jsx",
      "src/hooks/use-highlighted-code.js",
    ],
  },
  ...config,
  {
    settings: {
      "import/resolver": {
        alias: {
          map: [
            ["@", path.resolve(__dirname, "./src")],
            ["@lib", path.resolve(__dirname, "./src/lib")],
            ["@pages", path.resolve(__dirname, "./src/pages")],
            ["@constants", path.resolve(__dirname, "./src/lib/constants")],
            ["@public", path.resolve(__dirname, "./public")],
          ],
          extensions: [".js", ".jsx"],
        },
        node: {
          extensions: [".js", ".jsx"],
        },
      },
    },
  },

  {
    rules: {
      // disable handler naming rule for our project conventions
      "react/jsx-handler-names": "off",
      // short names like `e`, `res`, `props` are the house convention
      "unicorn/prevent-abbreviations": "off",
      // React 19 ignores `defaultProps` on function components; destructuring
      // defaults are the only mechanism that actually runs.
      "react/require-default-props": ["error", { functions: "defaultArguments" }],
      // Vite's ?raw suffix imports a file as text; the node resolver can't follow it.
      "import/no-unresolved": ["error", { ignore: [String.raw`\?raw$`] }],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Node scripts (the demo recorder) print progress to the terminal.
    files: ["demo/**/*.mjs"],
    languageOptions: { globals: globals.node },
    rules: { "no-console": "off" },
  },
]
