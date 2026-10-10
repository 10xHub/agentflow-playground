# 10xGraph Playground

> The visual playground for **10xGraph** (formerly Agentflow): graph engineering for production AI agents, by 10xScale.

10xGraph gives you everything you need to ship real multi-agent applications: graph-based orchestration, LLM-agnostic model support (OpenAI, Google GenAI, Anthropic), a 3-layer memory system (Redis cache + Postgres + vector store), live agents, parallel tool execution, and native MCP support, backed by a full ecosystem of backend, API, SDK, and UI.

This playground is the React + Vite frontend for testing and interacting with a 10xGraph backend through the TypeScript client. Spin up a server with `10xgraph play` and explore your agents visually.

> **⚠️ Temporary local client link.** The client is currently installed as
> `@10xscale/agentflow-client` from the local monorepo path (`file:../agentflow-client`)
> because the latest client (with WebSocket streaming, `stopGraph`/`fixGraph`) is not yet
> published to npm. Rebuild it with `npm run build` in `../agentflow-client` after
> changes. **Once `10xgraph-client` is published, swap the dependency in `package.json`
> to a versioned range** and remove this note. Until then, the `ws` transport in the
> chat UI is marked *coming soon* and disabled.

📖 **Docs:** https://10xgraph.com/docs

## 🧩 The 10xGraph Ecosystem

| Package | Formerly | What it does |
|---|---|---|
| **Core framework** (`10xgraph`) | `10xscale-agentflow` | Graph-based agent orchestration, 3-layer memory, parallel tools, MCP |
| **API + CLI** (`10xgraph-api`) | `10xscale-agentflow-cli` | FastAPI server auto-generated from your graph, auth, RBAC, rate limiting |
| **Client SDK** (`10xgraph-client`) | `@10xscale/agentflow-client` | Typed TypeScript/React client with streaming hooks |
| **Playground** (this repo) | | Visual React UI to test agents against a local server (`10xgraph play`) |

The packages are being republished under the 10xGraph names. Until a package is released under its
new name, install it under the former name.

- **GitHub:** https://github.com/10xGraph
- **Docs:** https://10xgraph.com/docs

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

Supported languages are in `public/locales/en/translation.json` and `public/locales/hi/translation.json`. The app uses `react-i18next` with language detection in the browser.

## 🪪 Environment variables

Add project-specific config in `.env` (if used). Vite supports `.env`, `.env.development`, and `.env.production`.

## Contributing

**Be the first community contributor on this wall.**

<a href="https://github.com/10xHub/agentflow-playground/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=10xHub/agentflow-playground" alt="People who have contributed to the 10xGraph Playground" />
</a>

So far only the lead maintainer has committed here, so the first community spot is open. Merge one pull request and your avatar is the next one on this wall and on the contributor page at [10xgraph.com/maintainers](https://10xgraph.com/maintainers). This is the screen developers use to watch their agents think, so a fix here is seen on every run.

Your first pull request can be small. These are real, self-contained, and useful today:

- **Make one screen translatable.** `public/locales/en/translation.json` holds only a few strings; most of the UI is still hard-coded. Move one screen's text into it, then add the same keys to `hi` or a new language.
- **Fix something that annoyed you.** A layout that breaks at your window size, a missing loading state, a confusing label.
- **Make it keyboard and screen-reader friendly.** A button without a label, a dialog that traps focus wrongly, a control you cannot reach with Tab.
- **Add a test for a component you touched.** Tests run with Vitest.

From clone to a running playground (Node 20 or newer, with a backend running via `10xgraph api`):

```bash
# The client is linked from ../agentflow-client until it is on npm, so clone both side by side.
git clone https://github.com/10xGraph/10xgraph-client.git agentflow-client
git clone https://github.com/10xHub/agentflow-playground.git
cd agentflow-playground
npm install
npm run dev     # rebuilds the local client first, then starts Vite
npm run lint && npm test && npm run build   # the checks CI runs
```

Draft pull requests are welcome, so open early and add a screenshot for UI changes. For bigger changes, start a thread in the core repository's [Discussions](https://github.com/10xGraph/10xGraph/discussions) first. [CONTRIBUTING.md](CONTRIBUTING.md) explains the local client link and where code lives.

## 📄 License

10xGraph is [MIT licensed](LICENSE) and made by [10xScale](https://10xscale.ai). Contributions
are accepted under the same license.

---

> This README was updated to match the current project structure and npm scripts.
