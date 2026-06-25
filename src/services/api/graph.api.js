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

  // Yield raw chunks so the UI can inspect the exact streaming payload
  for await (const chunk of stream) {
    yield chunk
  }
}

/**
 * Fix a wedged thread by removing dangling/empty tool calls from its
 * checkpoint so it can run again.
 * @param {string} threadId - id of the thread to repair
 * @returns {Promise<object>} { success, message, removed_count, state? }
 */
export const fixThread = async (threadId) => {
  const client = getAgentFlowClient()
  const response = await client.fixGraph(threadId)
  return response.data
}

export default {
  invokeGraph,
  streamGraph,
  fixThread,
}
