"""Regression evals for the Acme support agent. Run with `10xgraph eval`.

Tool-usage criteria compare the tools the agent called against the expected ones, so
these evals need no judge model. The cancel case fails on purpose: the agent has no
cancel tool yet, and the report shows exactly where the trajectory diverges.
"""

from tenxgraph.qa.evaluation import EvalConfig, EvalSet, EvalSetBuilder
from tenxgraph.qa.evaluation.config.eval_config import CriteriaConfig, CriterionConfig
from tenxgraph.qa.evaluation.config.types import MatchType


def get_eval_config() -> EvalConfig:
    # ANY_ORDER: tools called in the same step run in parallel, so the recorded
    # trajectory follows completion order, not call order.
    return EvalConfig(
        criteria=CriteriaConfig(
            tool_name_match=CriterionConfig.tool_name_match(threshold=1.0),
            trajectory=CriterionConfig.trajectory(
                threshold=1.0, match_type=MatchType.ANY_ORDER, check_args=False
            ),
        )
    )


def get_eval_set() -> EvalSet:
    return (
        EvalSetBuilder(name="acme-support-regression")
        .add_case(
            query="Order 1042 arrived broken. Can I get a refund?",
            expected="refunded",
            expected_tools=["lookup_order", "user_memory_tool", "issue_refund", "send_email"],
            case_id="refund_broken_order",
            description="Looks up the order and the contact preference, then refunds and emails.",
        )
        .add_case(
            query="What do you know about customer c_88, and where is order 1043?",
            expected="customer since",
            expected_tools=["get_customer_history", "lookup_order"],
            case_id="customer_history",
            description="Fetches the customer record and the order in one step.",
        )
        .add_tool_test(
            query="c_88 prefers email over phone, please remember that.",
            tool_name="user_memory_tool",
            case_id="remember_preference",
        )
        .add_tool_test(
            query="How many refunds were issued for order 1042?",
            tool_name="list_refunds",
            case_id="count_refunds",
        )
        .add_tool_test(
            query="Please cancel order 1043, it has not shipped yet.",
            tool_name="cancel_order",
            case_id="cancel_unshipped_order",
        )
        .build()
    )
