"""Tools for the Acme order support demo agent.

They are plain async functions. The short sleeps stand in for the latency of the real
order, CRM, payments and email APIs, so parallel tool calls overlap in the traces.
"""

import asyncio

from payments import Payments


ORDERS = {
    "1042": {
        "order_id": "1042",
        "customer_id": "c_88",
        "item": "Ceramic pour-over set",
        "total": 129.0,
        "shipping": "delivered",
        "delivered_on": "2026-10-11",
    },
    "1043": {
        "order_id": "1043",
        "customer_id": "c_88",
        "item": "Paper filters, pack of 200",
        "total": 18.0,
        "shipping": "in transit",
        "delivered_on": None,
    },
}

CUSTOMERS = {
    "c_88": {
        "customer_id": "c_88",
        "name": "Maya Chen",
        "email": "maya.chen@example.com",
        "customer_since": "2023-04",
        "orders": ["1042", "1043"],
        "open_tickets": 0,
    },
}

async def lookup_order(order_id: str) -> dict:
    """Look up an order by id: item, total, delivery status and customer."""
    await asyncio.sleep(0.35)
    return ORDERS.get(order_id, {"order_id": order_id, "error": "order not found"})


async def get_customer_history(customer_id: str) -> dict:
    """Get a customer's profile, past orders and open support tickets."""
    await asyncio.sleep(0.45)
    return CUSTOMERS.get(customer_id, {"customer_id": customer_id, "error": "customer not found"})


async def issue_refund(order_id: str, amount: float) -> dict:
    """Refund an order to the original payment method. Moves real money: call once."""
    await asyncio.sleep(0.3)
    refund = Payments().add_refund(order_id, amount)
    return {**refund, "refunded": True}


async def send_email(to: str, subject: str, body: str) -> dict:
    """Send an email to the customer."""
    await asyncio.sleep(0.25)
    return {"queued": True, "to": to, "subject": subject}


async def list_refunds(order_id: str) -> dict:
    """List every refund issued for an order, read from the payments system."""
    await asyncio.sleep(0.2)
    refunds = Payments().refunds_for(order_id)
    return {"order_id": order_id, "refunds": refunds, "count": len(refunds)}
