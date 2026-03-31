import { MessageSquarePlus, MoreVertical, Trash2, MessagesSquare } from "lucide-react"
import PropTypes from "prop-types"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  deleteThread,
  setActiveThread,
} from "@/services/store/slices/chat.slice"
import ct from "@constants/"

// Helper function to format dates
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now - date) / (1000 * 60 * 60)

  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (diffInHours < 168) {
    // 7 days
    return date.toLocaleDateString([], { weekday: "short" })
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }
}

// ThreadItem component to handle individual thread rendering
const ThreadItem = ({ thread, isActive, onSelect, onDelete }) => (
  <div
    role="button"
    tabIndex={0}
    className={cn(
      "group relative flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-100 w-full text-left select-none outline-none",
      isActive
        ? "bg-accent text-accent-foreground"
        : "hover:bg-accent/50 text-foreground/70 hover:text-foreground"
    )}
    onClick={() => onSelect(thread.id)}
    onKeyDown={(e) => e.key === "Enter" && onSelect(thread.id)}
  >
    <div className="flex-1 min-w-0">
      <p className={cn(
        "text-[13px] truncate leading-snug",
        isActive ? "font-medium text-foreground" : "font-normal"
      )}>
        {thread.title}
      </p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug">
        {thread.messages.length > 0
          ? thread.messages[thread.messages.length - 1].content
          : "No messages yet"}
      </p>
    </div>

    <div className="flex-shrink-0 flex items-center gap-1 pt-0.5">
      <span className="text-[10px] tabular-nums text-muted-foreground/80">
        {formatDate(thread.updatedAt)}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-transparent"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={(event) => onDelete(thread.id, event)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
)

const ThreadList = ({ className }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get threadId from URL search params
  const searchParams = new URLSearchParams(location.search)
  const threadId = searchParams.get("threadId")

  const { threads, activeThreadId } = useSelector(
    (state) => state[ct.store.CHAT_STORE]
  )

  const storeSettings = useSelector((state) => state[ct.store.SETTINGS_STORE])
  const isVerified = Boolean(storeSettings?.verification?.isVerified)

  // Sort threads by updatedAt in descending order
  const sortedThreads = useMemo(() => {
    return [...threads].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  }, [threads])

  const handleNewChatClick = () => {
    // Clear active thread and navigate to home page (empty state)
    // The thread will be created when user sends the first message
    dispatch(setActiveThread(null))
    navigate("/")
  }

  const handleSelectThread = (id) => {
    dispatch(setActiveThread(id))
    // Navigate to home page (dashboard) without threadId in URL
    // The Dashboard component will handle displaying the selected thread
    navigate("/")
  }

  const handleDeleteThread = (id, event) => {
    event.stopPropagation()
    dispatch(deleteThread(id))

    // Navigate to dashboard root if deleting current thread
    if (threadId === id || activeThreadId === id) {
      dispatch(setActiveThread(null))
      navigate("/")
    }
  }

  const handleNavigateToChat = () => {
    // Clear active thread and navigate to dashboard (home page)
    dispatch(setActiveThread(null))
    navigate("/")
  }

  const handleNewChatMaybe = () => {
    if (isVerified) handleNewChatClick()
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80 hover:text-foreground transition-colors"
          onClick={handleNavigateToChat}
        >
          <MessagesSquare className="h-3.5 w-3.5" />
          Conversations
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChatMaybe}
          disabled={!isVerified}
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="New conversation"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-4">
          {sortedThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground px-4 py-12 gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <MessagesSquare className="h-5 w-5 opacity-50" />
              </div>
              <div>
                <p className="text-[13px] font-medium">No conversations</p>
                <p className="text-[11px] mt-0.5">Start a new chat to begin</p>
              </div>
            </div>
          ) : (
            sortedThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={
                  threadId === thread.id || activeThreadId === thread.id
                }
                onSelect={handleSelectThread}
                onDelete={handleDeleteThread}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

ThreadItem.propTypes = {
  thread: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
    messages: PropTypes.array.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

ThreadList.propTypes = {
  className: PropTypes.string,
}

ThreadList.defaultProps = {
  className: "",
}

export default ThreadList
