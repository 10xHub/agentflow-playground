# Agentflow Playground

> The visual playground for **Agentflow** — a production-grade framework for building multi-agent AI systems.

Agentflow gives you everything you need to ship real multi-agent applications: graph-based orchestration, LLM-agnostic model support (OpenAI, Google GenAI, Anthropic), a 3-layer memory system (Redis cache + Postgres + vector store), live agents, parallel tool execution, and native MCP support — backed by a full ecosystem of backend, API, SDK, and UI.

This playground is the React + Vite frontend for testing and interacting with an Agentflow backend through `@10xscale/agentflow-client`. Spin up a server with `agentflow play` and explore your agents visually.

📖 **Docs:** https://10xhub.github.io/Agentflow/

## 🧩 The Agentflow Ecosystem

| Package | What it does | Install |
|---|---|---|
| **Core framework** (`10xscale-agentflow`) | Graph-based agent orchestration, 3-layer memory, parallel tools, MCP | `pip install 10xscale-agentflow` |
| **API + CLI** (`10xscale-agentflow-cli`) | FastAPI server auto-generated from your graph, auth, RBAC, rate limiting | `pip install 10xscale-agentflow-cli` |
| **Client SDK** (`@10xscale/agentflow-client`) | Typed TypeScript/React client with streaming hooks | `npm install @10xscale/agentflow-client` |
| **Playground** (this repo) | Visual React UI to test agents against a local server | `agentflow play` |

- **GitHub:** https://github.com/10xHub/agentflow
- **Docs:** https://10xhub.github.io/Agentflow/

## 🛠️ Features

- React 19 + Vite 6
- Redux Toolkit + persisted state
- Chat, thread, graph, and state inspection UI
- i18n (English/Hindi)
- Tailwind CSS styling with Radix UI primitives
- Unit tests with Vitest

## 🚀 Quickstart

### Prerequisites

- Node.js 20+ (recommended 22)
- npm 11+

### Install

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## 🧪 Testing

- Run tests:

```bash
npm run test
```

- Run coverage:

```bash
npm run coverage
```

- Run Vitest UI:

```bash
npm run test:ui
```

## 🔍 Lint and format

```bash
npm run lint
npm run lint:fix
npm run format
```

## 📁 Key folders

- `src/` - React app source code
- `src/components` - reusable UI components
- `src/pages` - route pages
- `src/services` - client wrappers and store logic
- `src/hooks` - custom hooks
- `src/lib` - shared utilities
- `public/` - static assets and translation files

## 🌎 Localization

Supported languages are in `src/locales/en/translation.json` and `src/locales/hi/translation.json`. The app uses `react-i18next` with language detection in the browser.

## 🪪 Environment variables

Add project-specific config in `.env` (if used). Vite supports `.env`, `.env.development`, and `.env.production`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Open a pull request with a clear description

---

> This README was updated to match the current project structure and npm scripts.
