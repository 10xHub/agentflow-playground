from tenxgraph.core.state import AgentState, Message
from tenxgraph.runtime.adapters.llm.model_response_converter import ModelResponseConverter

from scripted_agent import ScriptedAgent


def state_for(text):
    return AgentState(context=[Message.text_message(text, role="user")])


async def test_execute_returns_an_assistant_message_with_tool_calls_and_blocks():
    agent = ScriptedAgent(think_seconds=0)

    result = await agent.execute(state_for("Order 1042 arrived broken. Refund?"), {})
    assert isinstance(result, ModelResponseConverter)
    message = await result.invoke()

    assert message.role == "assistant"
    assert [c["function"]["name"] for c in message.tools_calls] == ["lookup_order", "user_memory_tool"]
    blocks = [b for b in message.content if b.type == "tool_call"]
    assert [b.name for b in blocks] == ["lookup_order", "user_memory_tool"]
    assert blocks[0].args == {"order_id": "1042"}


async def test_stream_yields_the_same_message():
    agent = ScriptedAgent(think_seconds=0)

    result = await agent.execute(state_for("Order 1042 arrived broken. Refund?"), {})
    streamed = [m async for m in result.stream({"thread_id": "t"}, "MAIN") if isinstance(m, Message)]

    assert [c["function"]["name"] for c in streamed[-1].tools_calls] == ["lookup_order", "user_memory_tool"]


async def test_execute_without_tools_returns_plain_text():
    agent = ScriptedAgent(think_seconds=0)

    message = await (await agent.execute(state_for("Tell me a joke"), {})).invoke()

    assert not message.tools_calls
    assert "suggested prompts" in message.content[0].text
