import {
  MessageSquarePlus,
  MoreHorizontal,
  Trash2,
  MessagesSquare,
} from "lucide-react"
import PropTypes from "prop-types"
import { useMemo, useEffect } from "react"
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
  fetchApiThreads,
  selectThread,
} from "@/services/store/slices/chat.slice"
import ct from "@constants/"

const getThreadPreview = (thread) => {
  const latestMessage = thread.messages?.[thread.messages.length - 1]
  const content = String(latestMessage?.content || "").replace(/\s+/g, " ").trim()

  return content || "No messages yet"
}

const getDayStart = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getSectionLabel = (dateString) => {
  const date = new Date(dateString)
  const today = getDayStart(new Date())
  const target = getDayStart(date)
  const diffInDays = Math.round((today - target) / (1000 * 60 * 60 * 24))

  if (diffInDays <= 0) return "Today"
  if (diffInDays === 1) return "Yesterday"
  if (diffInDays <= 7) return "Previous 7 Days"
  if (diffInDays <= 30) return "Previous 30 Days"
  return "Older"
}

const formatItemDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}, ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

const groupThreads = (threads) => {
  const sections = []
  const sectionIndex = new Map()

  threads.forEach((thread) => {
    const label = getSectionLabel(thread.updatedAt)
    const existingIndex = sectionIndex.get(label)

    if (existingIndex !== undefined) {
      sections[existingIndex].threads.push(thread)
      return
    }

    sectionIndex.set(label, sections.length)
    sections.push({
      label,
      threads: [thread],
    })
  })

  return sections
}

const ThreadItem = ({ thread, isActive, onSelect, onDelete }) => (
  <div
    role="button"
    tabIndex={0}
    className={cn(
      "group relative w-full rounded-xl border px-3 py-3 text-left outline-none transition-colors",
      isActive
        ? "border-sidebar-primary/30 bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]"
        : "border-transparent text-sidebar-foreground/78 hover:border-sidebar-border hover:bg-sidebar-accent/65"
    )}
    onClick={() => onSelect(thread.id)}
    onKeyDown={(event) => event.key === "Enter" && onSelect(thread.id)}
  >
    <div
      className={cn(
        "absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full transition-opacity",
        isActive ? "bg-sidebar-primary opacity-100" : "opacity-0"
      )}
    />

    <div className="min-w-0 pr-8">
      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
          <p
            title={thread.title}
            className={cn(
              "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-5",
              isActive
                ? "font-semibold text-sidebar-foreground"
                : "font-medium text-sidebar-foreground/92"
            )}
          >
            {thread.title}
          </p>
          <span className="shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-sidebar-foreground/45">
            {formatItemDate(thread.updatedAt)}
          </span>

          <p
            title={getThreadPreview(thread)}
            className="col-span-2 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-5 text-sidebar-foreground/52"
          >
            {getThreadPreview(thread)}
          </p>
        </div>
      </div>

    </div>

    <div
      className={cn(
        "absolute right-2 top-2 transition-opacity",
        isActive
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-sidebar-foreground/45 hover:bg-sidebar hover:text-sidebar-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={(event) => onDelete(thread.id, event)}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
)

const ThreadSection = ({ label, threads, activeThreadId, urlThreadId, onSelect, onDelete }) => (
  <section className="space-y-1.5">
    <div className="px-2 pt-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/38">
        {label}
      </h3>
    </div>
    <div className="space-y-1">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isActive={urlThreadId === thread.id || activeThreadId === thread.id}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  </section>
)

const ThreadList = ({ className }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const searchParameters = new URLSearchParams(location.search)
  const threadId = searchParameters.get("threadId")

  const { threads, activeThreadId } = useSelector(
    (state) => state[ct.store.CHAT_STORE]
  )

  const storeSettings = useSelector((state) => state[ct.store.SETTINGS_STORE])
  const isVerified = Boolean(storeSettings?.verification?.isVerified)

  useEffect(() => {
    if (isVerified) {
      dispatch(fetchApiThreads())
    }
  }, [isVerified, dispatch])

  const sortedThreads = useMemo(
    () =>
      [...threads].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [threads]
  )

  const groupedThreads = useMemo(() => groupThreads(sortedThreads), [sortedThreads])

  const handleNewChatClick = () => {
    dispatch(setActiveThread(null))
    navigate("/")
  }

  const handleSelectThread = (id) => {
    dispatch(selectThread(id))
    navigate("/")
  }

  const handleDeleteThread = (id, event) => {
    event.stopPropagation()
    dispatch(deleteThread(id))

    if (threadId === id || activeThreadId === id) {
      dispatch(setActiveThread(null))
      navigate("/")
    }
  }

  const handleNavigateToChat = () => {
    dispatch(setActiveThread(null))
    navigate("/")
  }

  const handleNewChatMaybe = () => {
    if (isVerified) handleNewChatClick()
  }

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className="border-b border-sidebar-border/70 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <button
            className="flex min-w-0 items-center gap-2 text-left"
            onClick={handleNavigateToChat}
          >
            <MessagesSquare className="h-4.5 w-4.5 text-sidebar-foreground/60" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-sidebar-foreground">
                Conversations
              </h2>
            </div>
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChatMaybe}
            disabled={!isVerified}
            className="h-9 w-9 rounded-xl text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="New conversation"
          >
            <MessageSquarePlus className="h-4.5 w-4.5" />
          </Button>
        </div>

        <p className="mt-2 pl-6 text-xs text-sidebar-foreground/45">
          {sortedThreads.length === 0
            ? "No saved threads"
            : `${sortedThreads.length} conversation${sortedThreads.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 py-3">
          {groupedThreads.length === 0 ? (
            <div className="mx-2 mt-4 rounded-2xl border border-dashed border-sidebar-border bg-sidebar-accent/25 px-4 py-10 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-sidebar-accent text-sidebar-foreground/60">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-sidebar-foreground">
                No conversations yet
              </p>
              <p className="mt-1 text-xs leading-5 text-sidebar-foreground/50">
                Start a new chat and it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedThreads.map((section) => (
                <ThreadSection
                  key={section.label}
                  label={section.label}
                  threads={section.threads}
                  activeThreadId={activeThreadId}
                  urlThreadId={threadId}
                  onSelect={handleSelectThread}
                  onDelete={handleDeleteThread}
                />
              ))}
            </div>
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

ThreadSection.propTypes = {
  label: PropTypes.string.isRequired,
  threads: PropTypes.array.isRequired,
  activeThreadId: PropTypes.string,
  urlThreadId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

ThreadSection.defaultProps = {
  activeThreadId: null,
  urlThreadId: null,
}

ThreadList.propTypes = {
  className: PropTypes.string,
}

ThreadList.defaultProps = {
  className: "",
}

export default ThreadList
