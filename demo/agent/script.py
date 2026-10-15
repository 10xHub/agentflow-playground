"""The demo agent's decisions, as a pure function of the conversation.

The demo runs without a language model: `next_step` plays the model's part with fixed
rules, so recordings cost nothing and come out the same every time. Everything around
it (the API, streaming, checkpointing, the tool ledger, memory, traces) is the real
10xGraph runtime.
"""

import json
import uuid
from dataclasses import dataclass, field
from typing import Any

from tenxgraph.core.state import Message


@dataclass
class Step:
    text: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)


def _call(name: str, **args: Any) -> dict[str, Any]:
    return {
        "id": f"call_{uuid.uuid4().hex[:12]}",
        "type": "function",
        "function": {"name": name, "arguments": json.dumps(args)},
    }


def _text(message: Message) -> str:
    return " ".join(getattr(block, "text", "") or "" for block in message.content).strip()


def _parse(output: Any) -> Any:
    # The runtime delivers a tool's return value wrapped in a one-item list.
    if isinstance(output, list) and len(output) == 1:
        output = output[0]
    if isinstance(output, str):
        try:
            return json.loads(output)
        except json.JSONDecodeError:
            return output
    return output


def _current_turn(context: list[Message]) -> tuple[str, dict[str, Any]]:
    """The latest user text, and tool outputs since then keyed by tool name."""
    last_user = max(i for i, m in enumerate(context) if m.role == "user")
    names: dict[str, str] = {}
    results: dict[str, Any] = {}
    for message in context[last_user + 1 :]:
        for call in message.tools_calls or []:
            names[call["id"]] = call["function"]["name"]
        if message.role == "tool":
            for block in message.content:
                call_id = getattr(block, "call_id", None)
                if call_id in names:
                    results[names[call_id]] = _parse(block.output)
    return _text(context[last_user]).lower(), results


def _refund(results: dict[str, Any]) -> Step:
    if "issue_refund" in results:
        refund = results["issue_refund"]
        remembered = "email" in json.dumps(results.get("memory_tool", ""))
        reason = ", since memory says the customer prefers email" if remembered else ""
        return Step(
            f"Done. I refunded ${refund['amount']:.2f} for order {refund['order_id']} "
            f"to the original payment method (refund {refund['refund_id']}) and emailed "
            f"the receipt{reason}."
        )
    if "lookup_order" in results:
        order = results["lookup_order"]
        return Step(
            "The order was delivered and is inside the 30-day window, so it qualifies "
            "for a full refund. Issuing it and emailing the receipt now.",
            [
                _call("issue_refund", order_id=order["order_id"], amount=order["total"]),
                _call(
                    "send_email",
                    to="maya.chen@example.com",
                    subject=f"Your refund for order {order['order_id']}",
                    body=f"We have refunded ${order['total']:.2f} for order {order['order_id']}.",
                ),
            ],
        )
    return Step(
        "Let me check the order and how this customer likes to be contacted.",
        [
            _call("lookup_order", order_id="1042"),
            _call("memory_tool", action="search", query="c_88 contact preference"),
        ],
    )


def _history(results: dict[str, Any]) -> Step:
    if "get_customer_history" in results:
        customer = results["get_customer_history"]
        order = results.get("lookup_order", {})
        return Step(
            f"{customer['name']} has been a customer since {customer['customer_since']}, "
            f"with orders {', '.join(customer['orders'])} and no open tickets. "
            f"Order {order.get('order_id')} ({order.get('item')}) is {order.get('shipping')}."
        )
    return Step(
        "Checking the customer record and the order together.",
        [_call("get_customer_history", customer_id="c_88"), _call("lookup_order", order_id="1043")],
    )


def _remember(results: dict[str, Any]) -> Step:
    if "memory_tool" in results:
        return Step("Saved. I will contact Maya Chen (c_88) by email from now on.")
    return Step(
        "",
        [
            _call(
                "memory_tool",
                action="store",
                content="Maya Chen (c_88) prefers email over phone.",
                category="preferences",
            )
        ],
    )


def _count(results: dict[str, Any]) -> Step:
    if "list_refunds" in results:
        summary = results["list_refunds"]
        count = summary["count"]
        noun = "refund" if count == 1 else "refunds"
        return Step(
            f"The payments system shows {count} {noun} for order {summary['order_id']}, "
            "read from the payments store, not from the conversation."
        )
    return Step("", [_call("list_refunds", order_id="1042")])


def next_step(context: list[Message]) -> Step:
    """Decide the assistant's next message from the conversation so far."""
    text, results = _current_turn(context)
    if "how many refunds" in text:
        return _count(results)
    if "refund" in text:
        return _refund(results)
    if "remember" in text:
        return _remember(results)
    if "c_88" in text and "order" in text:
        return _history(results)
    return Step(
        "In this demo I can look up orders, check a customer's history, issue refunds "
        "and remember preferences. Try one of the suggested prompts."
    )
