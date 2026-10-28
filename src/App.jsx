import { lazy, Suspense } from "react"
import { Provider } from "react-redux"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import AppShell from "@/components/shell/app-shell"
import { ConnectionProvider } from "@/lib/connection/connection-context"
import AnalyticsTracker from "@/lib/use-route-events"
import ChatPage from "@/pages/chat/chat-page"
import ConnectionPage from "@/pages/connect/connection-page"
import DemoEntry from "@/pages/demo/demo-entry"
import EvalsPage from "@/pages/evals/evals-page"
import FilesPage from "@/pages/files/files-page"
import LivePage from "@/pages/live/live-page"
import MemoryPage from "@/pages/memory/memory-page"
import Placeholder from "@/pages/placeholder"
import SettingsPage from "@/pages/settings/settings-page"
import ThreadsPage from "@/pages/threads/threads-page"
import ToolsPage from "@/pages/tools/tools-page"
import TracePage from "@/pages/trace/trace-page"
import { store } from "@/store"

// The graph page pulls in reaflow and the ELK layout engine (about 1.5 MB), so it
// loads on first visit to /graph instead of with the app.
const GraphPage = lazy(() => import("@/pages/graph/graph-page"))

const graphRoute = (
  <Suspense fallback={<Placeholder name="Graph" note="loading" />}>
    <GraphPage />
  </Suspense>
)

// The page was called Observability before it became Run trace; keep old links.
const ObservabilityRedirect = () => {
  const { search } = useLocation()
  return <Navigate to={`/trace${search}`} replace />
}

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
              <Route path="/trace" element={<TracePage />} />
              <Route
                path="/observability"
                element={<ObservabilityRedirect />}
              />
              <Route path="/evals" element={<EvalsPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/graph" element={graphRoute} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/files" element={<FilesPage />} />
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
