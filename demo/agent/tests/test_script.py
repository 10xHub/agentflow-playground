import json

from tenxgraph.core.state import Message
from tenxgraph.core.state.message_block import ToolResultBlock

from script import next_step


def user(text):
    return Message.text_message(text, role="user")


def answered(step, outputs):
    """The assistant message for `step`, then one tool message per call, in call order."""
    assistant = Message.text_message(step.text, role="assistant")
    assistant.tools_calls = step.tool_calls
    results = [
        Message.tool_message([ToolResultBlock(call_id=call["id"], output=output)])
        for call, output in zip(step.tool_calls, outputs, strict=True)
    ]
    return [assistant, *results]


def calls(step):
    return [(c["function"]["name"], json.loads(c["function"]["arguments"])) for c in step.tool_calls]


REFUND = "Order 1042 arrived broken. Can I get a refund?"
ORDER_1042 = {"order_id": "1042", "customer_id": "c_88", "total": 129.0, "shipping": "delivered"}
PREFS = json.dumps({"results": [{"content": "Maya Chen (c_88) prefers email over phone."}]})


def test_refund_starts_with_order_lookup_and_memory_search_in_one_step():
    step = next_step([user(REFUND)])
    names = [name for name, _ in calls(step)]
    assert names == ["lookup_order", "memory_tool"]
    assert calls(step)[0][1] == {"order_id": "1042"}
    assert calls(step)[1][1]["action"] == "search"


def test_refund_then_refunds_and_emails_in_parallel():
    first = next_step([user(REFUND)])
    second = next_step([user(REFUND), *answered(first, [ORDER_1042, PREFS])])
    assert [name for name, _ in calls(second)] == ["issue_refund", "send_email"]
    assert calls(second)[0][1] == {"order_id": "1042", "amount": 129.0}
    assert calls(second)[1][1]["to"] == "maya.chen@example.com"


def test_refund_answer_cites_the_refund_id():
    first = next_step([user(REFUND)])
    second = next_step([user(REFUND), *answered(first, [ORDER_1042, PREFS])])
    refund = {"refund_id": "rf_1234abcd", "order_id": "1042", "amount": 129.0}
    context = [user(REFUND), *answered(first, [ORDER_1042, PREFS])]
    context += answered(second, [refund, {"queued": True}])
    final = next_step(context)
    assert final.tool_calls == []
    assert "rf_1234abcd" in final.text


def test_history_calls_both_tools_in_one_step():
    step = next_step([user("What do you know about customer c_88, and where is order 1043?")])
    assert [name for name, _ in calls(step)] == ["get_customer_history", "lookup_order"]


def test_remember_stores_a_memory():
    step = next_step([user("c_88 prefers email over phone, please remember that.")])
    [(name, args)] = calls(step)
    assert name == "memory_tool"
    assert args["action"] == "store"
    assert "email" in args["content"]
    # Default (episodic) type: memory_tool search and the client both filter to it by default.
    assert "memory_type" not in args


def test_refund_count_reports_the_payments_total():
    prompt = "How many refunds were issued for order 1042?"
    step = next_step([user(prompt)])
    assert calls(step) == [("list_refunds", {"order_id": "1042"})]
    final = next_step([user(prompt), *answered(step, [{"order_id": "1042", "refunds": [{}], "count": 1}])])
    assert "1 refund" in final.text
    assert "killed" not in final.text


def test_unknown_prompt_answers_without_tools():
    step = next_step([user("Tell me a joke")])
    assert step.tool_calls == []
    assert step.text


def test_tool_call_ids_are_unique():
    first = next_step([user(REFUND)])
    again = next_step([user(REFUND)])
    ids = [c["id"] for c in first.tool_calls + again.tool_calls]
    assert len(set(ids)) == len(ids)


def test_refund_count_never_claims_once_when_it_was_twice():
    prompt = "How many refunds were issued for order 1042?"
    step = next_step([user(prompt)])
    final = next_step([user(prompt), *answered(step, [{"order_id": "1042", "refunds": [{}, {}], "count": 2}])])
    assert "2 refunds" in final.text
    assert "once" not in final.text


def test_reads_outputs_wrapped_in_a_list_as_the_runtime_sends_them():
    prompt = "How many refunds were issued for order 1042?"
    step = next_step([user(prompt)])
    final = next_step([user(prompt), *answered(step, [[{"order_id": "1042", "refunds": [{}], "count": 1}]])])
    assert "1 refund" in final.text


def test_refund_answer_only_cites_the_preference_when_memory_found_it():
    first = next_step([user(REFUND)])
    second = next_step([user(REFUND), *answered(first, [ORDER_1042, "[]"])])
    refund = {"refund_id": "rf_1234abcd", "order_id": "1042", "amount": 129.0}
    context = [user(REFUND), *answered(first, [ORDER_1042, "[]"])]
    context += answered(second, [refund, {"queued": True}])
    assert "prefers email" not in next_step(context).text
