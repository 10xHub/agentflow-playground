import { Provider } from "react-redux"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import AppShell from "@/components/shell/AppShell"
import { ConnectionProvider } from "@/lib/connection/ConnectionContext"
import ChatPage from "@/pages/chat/ChatPage"
import ConnectionPage from "@/pages/connect/ConnectionPage"
import EvalsPage from "@/pages/evals/EvalsPage"
import GraphPage from "@/pages/graph/GraphPage"
import LivePage from "@/pages/live/LivePage"
import MemoryPage from "@/pages/memory/MemoryPage"
import ObservabilityPage from "@/pages/observability/ObservabilityPage"
import Placeholder from "@/pages/Placeholder"
import SettingsPage from "@/pages/settings/SettingsPage"
import ThreadsPage from "@/pages/threads/ThreadsPage"
import ToolsPage from "@/pages/tools/ToolsPage"
import { store } from "@/store"

/**
 *
 */
export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ConnectionProvider>
          <Routes>
            <Route path="/" element={<ConnectionPage />} />
            <Route element={<AppShell />}>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/threads" element={<ThreadsPage />} />
              <Route path="/observability" element={<ObservabilityPage />} />
              <Route path="/evals" element={<EvalsPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              {/* Files is a "coming soon" stub until the real /v1/files
                  integration lands. */}
              <Route
                path="/files"
                element={<Placeholder name="Files" note="coming soon" />}
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </ConnectionProvider>
      </BrowserRouter>
    </Provider>
  )
}
