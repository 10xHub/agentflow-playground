import { Message } from "@10xscale/agentflow-client"

import { getAgentFlowClient } from "@/lib/agentflow-client"

const toClientMessage = (message) => {
  if (message instanceof Message) {
    return message
  }

  if (typeof message.content === "string") {
    return Message.text_message(
      message.content,
      message.role || "user",
      message.message_id || null
    )
  }

  return new Message(
    message.role || "user",
    message.content || [],
    message.message_id || null
  )
}

const mapBodyMessages = (messages = []) => messages.map(toClientMessage)

const formatStreamChunk = (chunk) => {
  if (chunk.event === "message" && chunk.message) {
    return {
      data: {
        message: chunk.message,
        delta: chunk.message.delta,
        metadata: chunk.metadata || {},
      },
    }
  }

  if (chunk.event === "updates" || chunk.event === "state") {
    return {
      data: {
        state: chunk.state,
        updates: chunk.updates,
        metadata: chunk.metadata || {},
      },
    }
  }

  return {
    data: {
      ...chunk,
      metadata: chunk.metadata || {},
    },
  }
}

/**
 * Invoke graph with messages
 * @param {object} body - GraphInputSchema-compatible payload
 * @returns {Promise<object>} - Response with messages
 */
export const invokeGraph = async (body) => {
  const client = getAgentFlowClient()
  const messages = mapBodyMessages(body.messages)

  const result = await client.invoke(messages, {
    initial_state: body.initial_state,
    config: body.config,
    recursion_limit: body.recursion_limit,
    response_granularity: body.response_granularity,
  })

  // Transform to match existing response format and include meta
  return {
    messages: result.messages || [],
    state: result.state,
    context: result.context,
    summary: result.summary,
    meta: result.meta || {},
    all_messages: result.all_messages || [],
    iterations: result.iterations || 0,
    recursion_limit_reached: result.recursion_limit_reached || false,
  }
}

/**
 * Stream graph execution using client library
 * @param {object} body GraphInputSchema-compatible payload
 * @param {object} [signal] optional abort signal to cancel streaming
 * @yields {object} parsed JSON objects per line/chunk
 */
export async function* streamGraph(body, signal) {
  const client = getAgentFlowClient()
  const messages = mapBodyMessages(body.messages)

  const stream = client.stream(messages, {
    initial_state: body.initial_state,
    config: body.config,
    recursion_limit: body.recursion_limit,
    response_granularity: body.response_granularity,
  })

  // Handle abort signal
  if (signal) {
    signal.addEventListener("abort", () => {
      // The client library should handle abort internally
    })
  }

  // Yield chunks in the format expected by the existing code
  for await (const chunk of stream) {
    yield formatStreamChunk(chunk)
  }
}

export default {
  invokeGraph,
  streamGraph,
}
