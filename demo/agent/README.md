# Acme support agent (playground demo)

The agent behind the playground's recorded demo (`/demo`). It runs on the real 10xGraph
runtime: `10xgraph-api` serves it, Postgres and Redis checkpoint every step, Qdrant holds
long-term memory, and `10xgraph eval` produces the eval report. The one stand-in is the
model: `ScriptedAgent` (see `script.py`) makes the decisions with fixed rules, so recording
costs nothing and comes out the same every time. Replace it with
`tenxgraph.core.graph.Agent(model=...)` to run the same graph on a real model.

| File | What it is |
|---|---|
| `graph.py` | The graph: `MAIN` (scripted agent) and `TOOL` (tool node) with a conditional edge |
| `tools.py`, `payments.py` | Order, customer, refund, email and refund-count tools; refunds are written to `payments.json` |
| `script.py`, `scripted_agent.py` | The scripted decisions and the node that turns them into assistant messages |
| `embedding.py` | A local hashing embedding, so Qdrant needs no embedding API |
| `store.py` | `QdrantStore` with a working memory list (the core one searches with an empty vector) |
| `evals/support_eval.py` | Five tool-usage evals; `cancel_unshipped_order` fails on purpose (no cancel tool) |
| `docker-compose.yml` | Postgres on 5433 and Redis on 6380 |

## Record the demo

From this folder:

```bash
uv venv --python 3.13 .venv && uv pip install --python .venv/bin/python -r requirements.txt
docker compose -p tenxgraph-demo up -d
PYTHONPATH=. .venv/bin/python setup_db.py

# 1. Evals first: they run the graph, so their threads are wiped in step 2.
DEMO_PAYMENTS_DB=/tmp/eval-payments.json .venv/bin/10xgraph eval

# 2. Clean state for the recording.
docker compose -p tenxgraph-demo down -v && docker compose -p tenxgraph-demo up -d
rm -rf qdrant_data payments.json && PYTHONPATH=. .venv/bin/python setup_db.py

# 3. Serve and record (the recorder lives in ../record.mjs; run it from the playground root).
.venv/bin/10xgraph dev --port 8010 --no-open
cd ../.. && node demo/record.mjs http://localhost:8010
```

`node demo/record.mjs` writes `src/demo/fixtures/support.json`. Never edit that file by
hand; change the agent or `demo/scenarios/support.json` and record again.

## Tests

```bash
.venv/bin/python -m pytest
```
