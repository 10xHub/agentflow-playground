import { getAgentFlowClient } from "@/lib/agentflow-client"

export const fetchStateSchema = async () => {
  const client = getAgentFlowClient()
  const response = await client.graphStateSchema()
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

export const fetchState = async (thread_id) => {
  const client = getAgentFlowClient()
  const response = await client.threadState(thread_id)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

export const putState = async (thread_id, body) => {
  const client = getAgentFlowClient()
  // body should conform to StateSchema (see openapi.json)
  // Extract config and state from body
  const { config = {}, state } = body
  const response = await client.updateThreadState(thread_id, config, state)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}

export const deleteState = async (thread_id) => {
  const client = getAgentFlowClient()
  const response = await client.clearThreadState(thread_id)
  // Transform to match existing response format
  return {
    data: response.data,
    status: 200,
  }
}
