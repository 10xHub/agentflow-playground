import { lazy, Suspense } from "react"
import { Provider } from "react-redux"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import AppShell from "@/components/shell/app-shell"
import { ConnectionProvider } from "@/lib/connection/connection-context"
import AnalyticsTracker from "@/lib/use-analytics-page-views"
import ChatPage from "@/pages/chat/chat-page"
import ConnectionPage from "@/pages/connect/connection-page"
import DemoEntry from "@/pages/demo/demo-entry"
import EvalsPage from "@/pages/evals/evals-page"
import LivePage from "@/pages/live/live-page"
import MemoryPage from "@/pages/memory/memory-page"
import ObservabilityPage from "@/pages/observability/observability-page"
import Placeholder from "@/pages/placeholder"
import SettingsPage from "@/pages/settings/settings-page"
import ThreadsPage from "@/pages/threads/threads-page"
import ToolsPage from "@/pages/tools/tools-page"
import { store } from "@/store"

// The graph page pulls in reaflow and the ELK layout engine (about 1.5 MB), so it
// loads on first visit to /graph instead of with the app.
const GraphPage = lazy(() => import("@/pages/graph/graph-page"))

const graphRoute = (
  <Suspense fallback={<Placeholder name="Graph" note="loading" />}>
    <GraphPage />
  </Suspense>
)

/**
 *
 */
const App = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ConnectionProvider>
          <AnalyticsTracker />
          <Routes>
            <Route path="/" element={<ConnectionPage />} />
            <Route path="/demo" element={<DemoEntry />} />
            <Route path="/demo/:scenario" element={<DemoEntry />} />
            <Route element={<AppShell />}>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/threads" element={<ThreadsPage />} />
              <Route path="/observability" element={<ObservabilityPage />} />
              <Route path="/evals" element={<EvalsPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/graph" element={graphRoute} />
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

export default App
