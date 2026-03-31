import { Navigate, useParams } from "react-router-dom"

import ct from "@constants/"
import Dashboard from "@pages/dashboard"

// Component to redirect chat thread to dashboard with threadId in query params
const ChatThreadRedirect = () => {
  const { threadId } = useParams()
  return <Navigate to={`/?threadId=${threadId}`} replace />
}

const mainRoutes = [
  { path: ct.route.ROOT, element: <Dashboard /> },
  // Redirect chat routes to dashboard
  { path: ct.route.CHAT, element: <Navigate to="/" replace /> },
  {
    path: ct.route.CHAT_THREAD,
    element: <ChatThreadRedirect />,
  },
]

export default mainRoutes
