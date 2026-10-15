"""Acme order support: the agent behind the 10xGraph Playground demo.

A MAIN node decides, a TOOL node runs the tools (in parallel when several are called in
one step), and a conditional edge loops between them until MAIN answers. State is
checkpointed to Postgres with a Redis cache in front, and long-term memory lives in
Qdrant. The MAIN node is scripted (see script.py) so the demo costs nothing to run;
replace ScriptedAgent with tenxgraph.core.graph.Agent(model=...) to use a real model.
"""

import os

from tenxgraph.core import StateGraph, ToolNode
from tenxgraph.core.state import AgentState
from tenxgraph.prebuilt.tools import memory_tool
from tenxgraph.storage.checkpointer import PgCheckpointer
from tenxgraph.utils.constants import END

from embedding import HashingEmbedding
from scripted_agent import ScriptedAgent
from store import DemoQdrantStore
from tools import get_customer_history, issue_refund, list_refunds, lookup_order, send_email


checkpointer = PgCheckpointer(
    postgres_dsn=os.environ.get("DEMO_POSTGRES_DSN", "postgresql://demo:demo@localhost:5433/demo"),
    redis_url=os.environ.get("DEMO_REDIS_URL", "redis://localhost:6380/0"),
)

store = DemoQdrantStore(embedding=HashingEmbedding(), path=os.environ.get("DEMO_QDRANT_PATH", "qdrant_data"))

tool_node = ToolNode(
    [lookup_order, get_customer_history, issue_refund, send_email, list_refunds, memory_tool]
)


def route(state: AgentState) -> str:
    """Run tools when MAIN asked for them; otherwise the turn is over."""
    last = state.context[-1] if state.context else None
    if last is not None and last.role == "assistant" and last.tools_calls:
        return "TOOL"
    return END


graph = StateGraph()
graph.add_node("MAIN", ScriptedAgent())
graph.add_node("TOOL", tool_node)
graph.add_conditional_edges("MAIN", route, {"TOOL": "TOOL", END: END})
graph.add_edge("TOOL", "MAIN")
graph.set_entry_point("MAIN")

# Run `python setup_db.py` once to create the checkpointer tables.
app = graph.compile(checkpointer=checkpointer, store=store)
