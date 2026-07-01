import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { ConnectionProvider } from "@/lib/connection/ConnectionContext"
import AppShell from "@/components/shell/AppShell"
import ChatPage from "@/pages/chat/ChatPage"
import ConnectionPage from "@/pages/connect/ConnectionPage"
import EvalsPage from "@/pages/evals/EvalsPage"
import FilesPage from "@/pages/files/FilesPage"
import GraphPage from "@/pages/graph/GraphPage"
import LivePage from "@/pages/live/LivePage"
import MemoryPage from "@/pages/memory/MemoryPage"
import ObservabilityPage from "@/pages/observability/ObservabilityPage"
import Placeholder from "@/pages/Placeholder"
import ThreadsPage from "@/pages/threads/ThreadsPage"
import ToolsPage from "@/pages/tools/ToolsPage"

export default function App() {
  return (
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
          <Route path="/files" element={<FilesPage />} />
          <Route path="/settings" element={<Placeholder name="Settings" />} />
        </Route>
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </ConnectionProvider>
    </BrowserRouter>
  )
}
