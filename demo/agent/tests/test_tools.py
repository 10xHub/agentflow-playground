from payments import Payments
from tools import issue_refund, list_refunds, lookup_order


async def test_lookup_order_returns_known_order():
    order = await lookup_order("1042")
    assert order["order_id"] == "1042"
    assert order["total"] == 129.0


async def test_refund_is_recorded_once_per_call(tmp_path, monkeypatch):
    monkeypatch.setenv("DEMO_PAYMENTS_DB", str(tmp_path / "payments.json"))
    await issue_refund("1042", 129.0)
    assert len((await list_refunds("1042"))["refunds"]) == 1


async def test_payments_store_survives_new_instance(tmp_path, monkeypatch):
    monkeypatch.setenv("DEMO_PAYMENTS_DB", str(tmp_path / "payments.json"))
    await issue_refund("1042", 129.0)
    assert len(Payments().refunds_for("1042")) == 1
