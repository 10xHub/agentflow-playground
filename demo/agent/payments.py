import json
import os
import uuid
from pathlib import Path


class Payments:
    """Refunds issued by the demo agent, stored outside the checkpointer on purpose.

    This file is independent evidence of how many times money moved, so the demo can
    show that a resumed run did not refund twice.
    """

    def __init__(self) -> None:
        self.path = Path(os.environ.get("DEMO_PAYMENTS_DB", "payments.json"))

    def _read(self) -> list[dict]:
        return json.loads(self.path.read_text()) if self.path.exists() else []

    def add_refund(self, order_id: str, amount: float) -> dict:
        refund = {"refund_id": f"rf_{uuid.uuid4().hex[:8]}", "order_id": order_id, "amount": amount}
        self.path.write_text(json.dumps([*self._read(), refund]))
        return refund

    def refunds_for(self, order_id: str) -> list[dict]:
        return [r for r in self._read() if r["order_id"] == order_id]
