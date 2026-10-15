# Contributing to the 10xGraph playground

Thanks for helping. This file covers the playground UI only. For the core framework, the CLI, or
the client SDK, see the `CONTRIBUTING.md` in those repositories.

## Scope of this repository

The React + Vite frontend that talks to a 10xGraph backend through
[`10xgraph-client`](https://www.npmjs.com/package/10xgraph-client). Anything about how the server behaves belongs in the API repo;
anything about how requests are made belongs in the client SDK.

## Setup

Node 20 or newer, plus a running backend (`10xgraph api`).

```bash
npm install
npm run dev        # http://localhost:5173
```

The client SDK comes from npm (`10xgraph-client`). To try an unreleased SDK change, run
`npm link` in your clone of the client and `npm link 10xgraph-client` here.

## The checks

```bash
npm run lint       # eslint
npm test           # vitest
npm run build      # production build
```

## Making a change

- Keep components in `src/components/`, routes in `src/pages/`, Redux slices in `src/store/`,
  shared helpers (including the client wrapper `src/lib/tenxgraph-client.js`) in `src/lib/`.
- User-facing strings go through `react-i18next`. Add new keys to both
  `public/locales/en/translation.json` and `public/locales/hi/translation.json`.
- Run `npm run format` before opening a pull request.

## Commit and pull request expectations

- One logical change per pull request. Split refactors from behaviour changes.
- Write commit subjects in the imperative mood: `fix thread list scroll on narrow viewports`.
- Explain _why_ in the pull request body, not just what.
- Include a screenshot for any visible change.
- CI must be green before review.

## License

The 10xGraph Playground is [MIT licensed](LICENSE) and made by [10xScale](https://10xscale.ai). Contributions
are accepted under the same license.
