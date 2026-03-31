/**
 * Custom React hooks for Agent Communication
 *
 * Provides easy-to-use hooks for A2A and A2UI communication in React components.
 */

import { useState, useEffect, useCallback } from "react"

/**
 * Hook for A2UI WebSocket connection
 */
export const useAgentWebSocket = (baseUrl, agentId, authToken = null) => {
  const [client, setClient] = useState(null)
  const [connectionState, setConnectionState] = useState("disconnected")
  const [error, setError] = useState(null)

  useEffect(() => {
    let activeClient = null
    let isMounted = true

    // Dynamically import the client
    import("@10xscale/agentflow-client")
      .then((module) => {
        const { A2UIClient } = module

        if (!isMounted) return null

        activeClient = new A2UIClient({
          baseUrl,
          agentId: agentId || "*",
          authToken,
          debug: true,
        })

        activeClient.onConnectionChange((state) => {
          setConnectionState(state)
        })

        activeClient.onError((error_) => {
          setError(error_)
        })

        activeClient.connect()
        setClient(activeClient)
        return null
      })
      .catch((error_) => {
        if (isMounted) setError(error_)
      })

    return () => {
      isMounted = false
      activeClient?.disconnect()
    }
  }, [baseUrl, agentId, authToken])

  return {
    client,
    connectionState,
    error,
    isConnected: connectionState === "connected",
  }
}

/**
 * Hook for agent status updates
 */
export const useAgentStatus = (client) => {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!client) return undefined

    const handler = (message) => {
      setStatus({
        status: message.data.status,
        message: message.data.message,
        timestamp: message.timestamp,
      })
    }

    client.on("AGENT_STATUS", handler)

    return () => {
      client.off("AGENT_STATUS", handler)
    }
  }, [client])

  return status
}

/**
 * Hook for agent messages
 */
export const useAgentMessages = (client) => {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!client) return undefined

    const handler = (message) => {
      setMessages((previous) => [
        ...previous,
        {
          content: message.data.content,
          role: message.data.role,
          timestamp: message.timestamp,
          message_id: message.data.message_id,
        },
      ])
    }

    client.on("AGENT_MESSAGE", handler)

    return () => {
      client.off("AGENT_MESSAGE", handler)
    }
  }, [client])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, clearMessages }
}

/**
 * Hook for A2A client
 */
export const useA2AClient = (baseUrl, authToken = null) => {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import("@10xscale/agentflow-client")
      .then((module) => {
        const { A2AClient } = module
        const newClient = new A2AClient(baseUrl, authToken)
        setClient(newClient)
        setLoading(false)
        return null
      })
      .catch(() => {
        setLoading(false)
      })
  }, [baseUrl, authToken])

  return { client, loading }
}

/**
 * Hook for fetching active agents
 */
export const useActiveAgents = (
  baseUrl,
  authToken = null,
  refreshInterval = 5000
) => {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAgents = useCallback(async () => {
    try {
      const headers = {}
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }

      const response = await fetch(`${baseUrl}/api/v1/agents`, { headers })
      const data = await response.json()
      setAgents(data.agents || [])
      setError(null)
    } catch (error_) {
      setError(error_.message)
    } finally {
      setLoading(false)
    }
  }, [baseUrl, authToken])

  useEffect(() => {
    fetchAgents()

    if (refreshInterval) {
      const interval = setInterval(fetchAgents, refreshInterval)
      return () => clearInterval(interval)
    }

    return undefined
  }, [fetchAgents, refreshInterval])

  return { agents, loading, error, refresh: fetchAgents }
}
