import { getAgentFlowClient } from "@/lib/agentflowClient"

/**
 * Ping the backend to verify connectivity
 * @returns {Promise<object>} - Ping result with status and response time
 */
export const pingBackend = async () => {
  const client = getAgentFlowClient()
  const response = await client.ping()
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

/**
 * Fetch graph data from the backend
 * @returns {Promise<object>} - Graph data and metadata
 */
export const fetchGraphData = async () => {
  const client = getAgentFlowClient()
  const response = await client.graph()
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}
