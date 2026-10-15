# 10xGraph Playground

> The visual playground for **10xGraph**: graph engineering for production AI agents, by 10xScale.

Connect the playground to any 10xGraph API server and you can chat with your agent, watch each
run step through the graph, inspect and edit thread state, read traces, review eval results,
browse long-term memory, and test client-side tools. It talks to the server only through the
public TypeScript client, [`10xgraph-client`](https://www.npmjs.com/package/10xgraph-client), so
everything you see here is something your own frontend can do too.

**Docs:** https://10xgraph.com/docs

## Try it

The fastest path is the CLI, which starts your agent's API and opens the hosted playground
already connected to it:

```bash
pip install 10xgraph 10xgraph-api
10xgraph init        # scaffold an agent project
10xgraph play        # start the API on :8000 and open the playground
```

You can also open the playground yourself and enter the server URL on the connect screen, or
pass it in the link: `?backendUrl=http://localhost:8000` (add `&token=...` for a bearer token).

No server yet? Open [`/demo`](https://playground-463bd.web.app/demo) for a recorded tour: a
support agent's chat runs, threads, traces, memory and eval report, replayed from a real
10xGraph server. It makes no model or backend calls, and it never touches your saved
connections.

## What's inside

| Screen | What it shows |
|---|---|
| **Chat** | Invoke or stream a run, with reasoning, tool calls and tool results rendered inline. Stop a run, or fix a thread left with a dangling tool call. An inspector shows stream events, thread state, the graph path, raw frames and a ready-to-run cURL for each request. |
| **Live** | Realtime voice sessions with a live agent (microphone in, audio out). |
| **Thread Inspector** | Browse threads, read and edit checkpointed state, delete messages or whole threads. |
| **Observability** | Per-run traces: a span timeline, events, token usage and an estimated cost. |
| **Evals** | Eval run results with drill-down into each case. |
| **Memory Inspector** | Search, list and delete long-term memories in the configured store. |
| **Graph** | The compiled graph with auto layout, node details and the state schema. |
| **Tools & MCP** | Server, MCP and remote tools, plus browser-side handlers for client tools. |
| **Settings** | Saved connections and auth (none, bearer/JWT, basic or a custom header). |

**Coming soon:** WebSocket streaming in Chat, and the Files screen.

## The 10xGraph ecosystem

| Package | Install | What it does |
|---|---|---|
| Core framework | `pip install 10xgraph` | Graph-based agent orchestration, durable state, parallel tools, MCP, evals |
| API + CLI | `pip install 10xgraph-api` | FastAPI server generated from your graph: auth, RBAC, rate limiting, the `10xgraph` command |
| Client SDK | `npm install 10xgraph-client` | Typed TypeScript client: invoke, stream, threads, memory, files, realtime |
| Playground | this repository | The UI on this page |

These packages were previously published as `10xscale-agentflow`, `10xscale-agentflow-cli` and
`@10xscale/agentflow-client`.

- **GitHub:** https://github.com/10xGraph
- **Docs:** https://10xgraph.com/docs

## Develop locally

Requires Node.js 20 or newer (22 recommended) and a running 10xGraph API (`10xgraph api`).

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run coverage` | Tests with coverage |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` | Prettier |

Built with React 19, Vite 6, Redux Toolkit, Tailwind CSS 4 and Radix UI. The graph view uses
reaflow with ELK auto layout and loads on first visit to the Graph screen.

### Key folders

- `src/pages/` - one folder per screen
- `src/store/` - Redux slices and thunks that call the API
- `src/lib/` - shared helpers, including the client wrapper `tenxgraph-client.js`
- `src/components/` - the app shell and shared UI primitives
- `public/locales/` - translations (English and Hindi)
- `src/lib/demo/` - the recorded demo: `DemoClient` answers the client methods from
  `src/demo/fixtures/support.json`, which `demo/record.mjs` writes. The agent behind it and the
  recording steps are in [`demo/agent/README.md`](demo/agent/README.md)

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

From clone to a running playground (with a backend running via `10xgraph api`):

```bash
git clone https://github.com/10xHub/agentflow-playground.git
cd agentflow-playground
npm install
npm run dev
npm run lint && npm test && npm run build   # the checks CI runs
```

Draft pull requests are welcome, so open early and add a screenshot for UI changes. For bigger changes, start a thread in the core repository's [Discussions](https://github.com/10xGraph/10xGraph/discussions) first. [CONTRIBUTING.md](CONTRIBUTING.md) explains where code lives and how to test an unreleased client change.

## License

The 10xGraph Playground is [MIT licensed](LICENSE) and made by [10xScale](https://10xscale.ai).
Contributions are accepted under the same license.
