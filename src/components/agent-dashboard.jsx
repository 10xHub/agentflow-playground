/**
 * Agent Dashboard Component
 *
 * Displays a real-time dashboard of all active agents with their status,
 * capabilities, and recent activity.
 */

// eslint-disable-next-line import/named
import { A2UIClient } from "@10xscale/agentflow-client"
import PropTypes from "prop-types"
import React, { useState, useEffect } from "react"

// eslint-disable-next-line max-lines-per-function, complexity
const AgentDashboard = ({ baseUrl, authToken }) => {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connectionState, setConnectionState] = useState("disconnected")

  useEffect(() => {
    let client = null

    const initClient = async () => {
      try {
        // Fetch initial agent list
        const response = await fetch(`${baseUrl}/api/v1/agents`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        })
        const data = await response.json()
        setAgents(data.agents || [])
        setLoading(false)

        // Connect to WebSocket for real-time updates
        client = new A2UIClient({
          baseUrl,
          agentId: "*", // Subscribe to all agents
          authToken,
          debug: true,
        })

        client.onConnectionChange((state) => {
          setConnectionState(state)
        })

        client.on("AGENT_STATUS", (message) => {
          // Update agent status in real-time
          setAgents((previous) =>
            previous.map((agent) =>
              agent.agent_id === message.agent_id
                ? { ...agent, status: message.data.status }
                : agent
            )
          )
        })

        client.onError((error_) => {
          setError(error_.message)
        })

        client.connect()
      } catch (error_) {
        setError(error_.message)
        setLoading(false)
      }
    }

    initClient()

    return () => {
      if (client) {
        client.disconnect()
      }
    }
  }, [baseUrl, authToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading agents...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    )
  }

  return (
    <div className="agent-dashboard">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Agent Dashboard</h2>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected"
                ? "bg-green-500"
                : connectionState === "connecting" ||
                    connectionState === "reconnecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          ></div>
          <span className="text-gray-600">
            {connectionState === "connected"
              ? "Connected"
              : connectionState === "connecting"
                ? "Connecting..."
                : connectionState === "reconnecting"
                  ? "Reconnecting..."
                  : "Disconnected"}
          </span>
          <span className="text-gray-400 ml-4">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.agent_id} agent={agent} />
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No active agents found
        </div>
      )}
    </div>
  )
}

const AgentCard = ({ agent }) => {
  const defaultStatusClass = "bg-gray-100 text-gray-800"
  const statusColors = {
    active: "bg-green-100 text-green-800",
    idle: "bg-blue-100 text-blue-800",
    busy: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    offline: defaultStatusClass,
  }
  const defaultStatusClassName = defaultStatusClass

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">{agent.agent_name}</h3>
          <p className="text-sm text-gray-500">{agent.agent_id}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            statusColors[agent.status] || defaultStatusClassName
          }`}
        >
          {agent.status}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">Type: {agent.agent_type}</p>
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.capabilities.map((capability) => (
              <span
                key={`${agent.agent_id}-${capability}`}
                className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs"
              >
                {capability}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 border-t pt-2">
        <div>Registered: {new Date(agent.registered_at).toLocaleString()}</div>
        <div>Last seen: {new Date(agent.last_heartbeat).toLocaleString()}</div>
      </div>
    </div>
  )
}

AgentCard.propTypes = {
  agent: PropTypes.shape({
    agent_name: PropTypes.string,
    agent_id: PropTypes.string,
    status: PropTypes.string,
    agent_type: PropTypes.string,
    capabilities: PropTypes.arrayOf(PropTypes.string),
    registered_at: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    last_heartbeat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
}

AgentDashboard.propTypes = {
  baseUrl: PropTypes.string.isRequired,
  authToken: PropTypes.string,
}

AgentDashboard.defaultProps = {
  authToken: null,
}

export default AgentDashboard
