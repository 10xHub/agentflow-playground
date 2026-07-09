import {
  Activity,
  ClipboardCheck,
  Database,
  FileText,
  ListTree,
  MessageSquare,
  Mic,
  Workflow,
  Wrench,
} from "lucide-react"

// Single source of truth for the left rail groups and the router paths.
export const NAV_GROUPS = [
  {
    heading: "Interact",
    items: [
      { to: "/chat", label: "Chat", icon: MessageSquare },
      { to: "/live", label: "Live", icon: Mic },
    ],
  },
  {
    heading: "Inspect",
    items: [
      { to: "/threads", label: "Thread Inspector", icon: ListTree },
      { to: "/observability", label: "Observability", icon: Activity },
      { to: "/evals", label: "Evals", icon: ClipboardCheck },
      { to: "/memory", label: "Memory Inspector", icon: Database },
    ],
  },
  {
    heading: "Build",
    items: [
      { to: "/graph", label: "Graph", icon: Workflow },
      { to: "/tools", label: "Tools & MCP", icon: Wrench },
      // Files stays in the rail but the page is a "coming soon" stub — the real
      // upload/fetch integration lands later (see App.jsx /files route).
      { to: "/files", label: "Files", icon: FileText, badge: "Soon" },
    ],
  },
]
