import { getAgentFlowClient } from "@/lib/agentflow-client"

/**
 * List threads with optional filters
 * @param {object} parameters - Optional query params { search, offset, limit }
 */
export const listThreads = async (parameters = {}) => {
  const client = getAgentFlowClient()
  const response = await client.threads(
    parameters.search,
    parameters.offset,
    parameters.limit
  )
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

/**
 * Get a single thread by id
 * @param {string|number} thread_id - ID of the thread to fetch
 */
export const getThread = async (thread_id) => {
  const client = getAgentFlowClient()
  const response = await client.threadDetails(thread_id)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

/**
 * Delete a thread by id
 * @param {string|number} thread_id - ID of the thread to delete
 */
export const deleteThread = async (thread_id) => {
  const client = getAgentFlowClient()
  const response = await client.deleteThread(thread_id)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

export default {
  listThreads,
  getThread,
  deleteThread,
}
