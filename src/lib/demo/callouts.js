// One line per screen tying what the visitor sees to a pillar in POSITIONING.md.
// Rule: every claim about this agent must be visible on that screen or in the
// agent source (the banner's "View agent source"); fixture-claims.test.js checks
// the recorded ones. The Settings line states product facts (install, license).
// Re-check this copy whenever demo/record.mjs re-records the fixture.

export const PILLARS = {
  1: "Production server in the box",
  3: "Built to scale",
  4: "One stack",
  5: "You own it",
}

export const CALLOUTS = {
  "/chat": {
    pillar: 1,
    text: "Each answer streamed from POST /v1/graph/stream, an endpoint 10xgraph-api generated from the agent's graph. The Inspector shows the raw events and a cURL for the same call.",
  },
  "/threads": {
    pillar: 3,
    text: "These threads were saved by the agent's PgCheckpointer: PostgreSQL for durable history, with a Redis cache in front (see the agent source). demo-refund keeps both of its runs.",
  },
  "/trace": {
    pillar: 1,
    text: "A trace for each run, served by the API's observability endpoint. In the customer-history run, one MAIN step called both get_customer_history and lookup_order.",
  },
  "/evals": {
    pillar: 1,
    text: "A report from 10xgraph eval against this agent. One case fails on purpose: the agent has no cancel tool, and the report shows which check failed.",
  },
  "/memory": {
    pillar: 3,
    text: "The memory the agent saved with its memory tool, in a Qdrant vector store (see the agent source). The refund run searched it to choose email over phone.",
  },
  "/graph": {
    pillar: 4,
    text: "The compiled graph from graph.py: MAIN either calls TOOL, which hands back to MAIN, or ends the turn. View the agent source to see all of it.",
  },
  "/tools": {
    pillar: 4,
    text: "Tools are plain async Python functions, listed here from the server's /v1/graph/tools endpoint.",
  },
  "/settings": {
    pillar: 5,
    text: "To use your own agent: pip install 10xgraph 10xgraph-api, then 10xgraph dev. MIT licensed and self-hosted.",
  },
}

// Run trace shows this recorded trace until the visitor plays a prompt in Chat.
export const DEMO_TRACE_THREAD = "demo-history"

/** The callout for a route, or null for screens without one. */
export const calloutFor = (pathname) => CALLOUTS[pathname] ?? null
