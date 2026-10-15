"""A graph node that plays the model's part from script.py instead of calling an LLM."""

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any

from tenxgraph.core.graph.base_agent import BaseAgent
from tenxgraph.core.state import AgentState, Message
from tenxgraph.core.state.message_block import ToolCallBlock
from tenxgraph.runtime.adapters.llm.base_converter import BaseConverter
from tenxgraph.runtime.adapters.llm.model_response_converter import ModelResponseConverter

from script import Step, next_step


class _StepConverter(BaseConverter):
    """Turns a scripted Step into the assistant Message a model response would produce."""

    async def convert_response(self, response: Step) -> Message:
        message = Message.text_message(response.text, role="assistant")
        if response.tool_calls:
            message.tools_calls = response.tool_calls
            message.content = [
                *message.content,
                *(
                    ToolCallBlock(
                        id=call["id"],
                        name=call["function"]["name"],
                        args=json.loads(call["function"]["arguments"]),
                    )
                    for call in response.tool_calls
                ),
            ]
        return message

    async def convert_streaming_response(
        self, config: dict, node_name: str, response: Step, meta: dict | None = None
    ) -> AsyncGenerator[Message]:
        yield await self.convert_response(response)


class ScriptedAgent(BaseAgent):
    def __init__(self, think_seconds: float = 0.8, **kwargs: Any) -> None:
        super().__init__(model="scripted", **kwargs)
        # Stands in for model latency, so replays pace like a real run.
        self.think_seconds = think_seconds

    async def _call_llm(self, messages: list[dict[str, Any]], tools: list | None = None, **kwargs):
        raise NotImplementedError("ScriptedAgent never calls a model")

    async def execute(self, state: AgentState, config: dict[str, Any]) -> ModelResponseConverter:
        await asyncio.sleep(self.think_seconds)
        return ModelResponseConverter(next_step(list(state.context)), converter=_StepConverter())
