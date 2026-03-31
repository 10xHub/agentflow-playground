import { getAgentFlowClient } from "@/lib/agentflow-client"

/**
 * Put messages into a thread (store messages)
 * POST /v1/threads/{thread_id}/messages
 * @param {string|number} thread_id - ID of the thread
 * @param {object} body - Body matching PutMessagesSchema { messages: [...], config?, metadata? }
 */
export const putMessages = async (thread_id, body) => {
  const client = getAgentFlowClient()
  const request = {
    messages: body.messages || [],
    config: body.config,
    metadata: body.metadata,
  }
  const response = await client.addThreadMessages(thread_id, request)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

/**
 * List messages from a thread with optional filters
 * GET /v1/threads/{thread_id}/messages
 * @param {string|number} thread_id - ID of the thread
 * @param {object} parameters - Optional query params { search, offset, limit }
 */
export const listMessages = async (thread_id, parameters = {}) => {
  const client = getAgentFlowClient()
  const request = {}
  if (parameters.search !== undefined) request.search = parameters.search
  if (parameters.offset !== undefined) request.offset = parameters.offset
  if (parameters.limit !== undefined) request.limit = parameters.limit

  const response = await client.threadMessages(thread_id, request)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

/**
 * Get a specific message by id
 * GET /v1/threads/{thread_id}/messages/{message_id}
 * @param {string|number} thread_id - ID of the thread
 * @param {string|number} message_id - ID of the message
 */
export const getMessage = async (thread_id, message_id) => {
  const client = getAgentFlowClient()
  const request = { message_id }
  const response = await client.threadMessage(thread_id, request)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

/**
 * Delete a specific message
 * DELETE /v1/threads/{thread_id}/messages/{message_id}
 * @param {string|number} thread_id - ID of the thread
 * @param {string|number} message_id - ID of the message
 */
export const deleteMessage = async (thread_id, message_id) => {
  const client = getAgentFlowClient()
  const request = { message_id }
  const response = await client.deleteThreadMessage(thread_id, request)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

export default {
  putMessages,
  listMessages,
  getMessage,
  deleteMessage,
}
