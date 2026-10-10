# Contributing to the 10xGraph playground

Thanks for helping. This file covers the playground UI only. For the core framework, the CLI, or
the client SDK, see the `CONTRIBUTING.md` in those repositories.

## Scope of this repository

The React + Vite frontend that talks to a 10xGraph backend through
`@10xscale/agentflow-client`. Anything about how the server behaves belongs in the API repo;
anything about how requests are made belongs in the client SDK.

## Setup

Node 20 or newer, plus a running backend (`10xgraph api`).

```bash
npm install
npm run dev        # predev rebuilds the local client first
```

The client SDK is currently linked from the local monorepo path (`file:../agentflow-client`)
rather than npm. `predev` and `prebuild` rebuild it for you; if you change the SDK while the dev
server is running, use `npm run watch:client`.

## The checks

```bash
npm run lint       # eslint
npm test           # vitest
npm run build      # production build
```

## Making a change

- Keep components in `src/components/`, routes in `src/pages/`, client and store logic in
  `src/services/`, shared helpers in `src/lib/`.
- User-facing strings go through `react-i18next`. Add new keys to both
  `src/locales/en/translation.json` and `src/locales/hi/translation.json`.
- Run `npm run format` before opening a pull request.

## Commit and pull request expectations

- One logical change per pull request. Split refactors from behaviour changes.
- Write commit subjects in the imperative mood: `fix thread list scroll on narrow viewports`.
- Explain _why_ in the pull request body, not just what.
- Include a screenshot for any visible change.
- CI must be green before review.

## License

Agentflow is [MIT licensed](LICENSE) and made by [10xScale](https://10xscale.ai). Contributions
are accepted under the same license.
