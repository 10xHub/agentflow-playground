import { MessageSquarePlus, MoreHorizontal, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

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
  createThread,
  deleteThread,
  setActiveThread,
} from "@/services/store/slices/chat.slice"
import ct from "@constants/"
// Tooltip components are not used here; remove to satisfy lint

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
  <button
    type="button"
    className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent w-full text-left ${
      isActive ? "bg-accent text-accent-foreground" : ""
    }`}
    onClick={() => onSelect(thread.id)}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium truncate pr-2">{thread.title}</h3>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatDate(thread.updatedAt)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {thread.messages.length > 0
          ? thread.messages[thread.messages.length - 1].content.slice(0, 30)
          : "No messages yet"}
      </p>
    </div>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(event) => onDelete(thread.id, event)}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </button>
)

const ThreadList = ({ className }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { threadId } = useParams()

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
    const newThread = dispatch(createThread({ title: "New Chat" }))
    navigate(`/chat/${newThread.payload.id || Date.now().toString()}`)
  }

  const handleSelectThread = (id) => {
    dispatch(setActiveThread(id))
    navigate(`/chat/${id}`)
  }

  const handleDeleteThread = (id, event) => {
    event.stopPropagation()
    dispatch(deleteThread(id))

    // Navigate to chat root if deleting current thread
    if (threadId === id || activeThreadId === id) {
      navigate("/chat")
    }
  }

  const handleNavigateToChat = () => {
    // check we are not in the chat page
    if (window.location.pathname !== "/chat") {
      navigate("/chat")
    }
  }

  const handleNewChatMaybe = () => {
    if (isVerified) handleNewChatClick()
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-2 flex-shrink-0">
        <button
          type="button"
          className="text-lg font-semibold ml-2 hover:underline"
          onClick={handleNavigateToChat}
        >
          Chats
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChatMaybe}
          disabled={!isVerified}
          className="h-8 w-8"
          aria-label="New chat"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {sortedThreads.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              <MessageSquarePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new chat to begin</p>
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
