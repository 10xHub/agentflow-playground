import Dashboard from "@pages/dashboard"
import MemoryPage from "@pages/memory"
import { Navigate, useParams } from "react-router-dom"

import ct from "@constants/"

// Component to redirect chat thread to dashboard with threadId in query params
const ChatThreadRedirect = () => {
  const { threadId } = useParams()
  return <Navigate to={`/?threadId=${threadId}`} replace />
}

const mainRoutes = [
  { path: ct.route.ROOT, element: <Dashboard /> },
  {
    path: ct.route.CHAT_THREAD,
    element: <ChatThreadRedirect />,
  },
  { path: ct.route.MEMORY, element: <MemoryPage /> },
]

export default mainRoutes
