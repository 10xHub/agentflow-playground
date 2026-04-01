# Agentflow Playground

Agentflow Playground is a React + Vite frontend for interacting with an AgentFlow backend through the `@10xscale/agentflow-client`.

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
