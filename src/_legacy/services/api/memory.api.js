import { getAgentFlowClient } from "@/lib/agentflow-client"

/**
 * Thin wrappers over the AgentFlowClient memory-store methods. Each returns the
 * same { data, status } envelope the rest of the playground API layer uses.
 */

export const listMemories = async ({ config = {}, limit = 100 } = {}) => {
  const client = getAgentFlowClient()
  const response = await client.listMemories({ config, limit })
  return { data: response.data, status: 200 }
}

export const searchMemories = async ({ config = {}, ...request } = {}) => {
  const client = getAgentFlowClient()
  const response = await client.searchMemory({ ...request, config })
  return { data: response.data, status: 200 }
}

export const storeMemory = async ({ config = {}, ...request } = {}) => {
  const client = getAgentFlowClient()
  const response = await client.storeMemory({ ...request, config })
  return { data: response.data, status: 200 }
}

export const updateMemory = async (
  memoryId,
  content,
  { config = {}, metadata } = {}
) => {
  const client = getAgentFlowClient()
  const response = await client.updateMemory(memoryId, content, {
    config,
    metadata,
  })
  return { data: response.data, status: 200 }
}

export const deleteMemory = async (memoryId, { config = {} } = {}) => {
  const client = getAgentFlowClient()
  const response = await client.deleteMemory(memoryId, { config })
  return { data: response.data, status: 200 }
}

export const forgetMemories = async ({ config = {}, ...request } = {}) => {
  const client = getAgentFlowClient()
  const response = await client.forgetMemories({ ...request, config })
  return { data: response.data, status: 200 }
}
