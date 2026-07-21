import { getAgentFlowClient } from "@/lib/agentflow-client"

/**
 * Fetch the server's multimodal configuration.
 * GET /v1/config/multimodal
 * @returns {Promise<{ data: object, status: number }>} Response whose data has media_max_size_mb and document_handling
 */
export const getMultimodalConfig = async () => {
  const client = getAgentFlowClient()
  const response = await client.getMultimodalConfig()
  return {
    data: response.data,
    status: 200,
  }
}

export default {
  getMultimodalConfig,
}
