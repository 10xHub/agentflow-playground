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
      // Dead code kept for reference only; nothing outside it imports from it.
      "src/_legacy/**",
    ],
  },
  ...config,
  {
    settings: {
      "import/resolver": {
        alias: {
          map: [
            ["@", path.resolve(__dirname, "./src")],
            ["@hooks", path.resolve(__dirname, "./src/hooks")],
            ["@lib", path.resolve(__dirname, "./src/lib")],
            ["@context", path.resolve(__dirname, "./src/lib/context")],
            ["@pages", path.resolve(__dirname, "./src/pages")],
            ["@constants", path.resolve(__dirname, "./src/lib/constants")],
            ["@api", path.resolve(__dirname, "./src/services/api")],
            ["@query", path.resolve(__dirname, "./src/services/query")],
            ["@store", path.resolve(__dirname, "./src/services/store")],
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
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
]
