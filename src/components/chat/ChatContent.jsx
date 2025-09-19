import { useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

import {
  createThread,
  sendMessage as sendMessageThunk,
} from "@/services/store/slices/chat.slice"
import ct from "@constants/"

import EmptyChatView from "./EmptyChatView"
import MessageView from "./MessageView"

/**
 * ChatContent component provides the main chat content area (right side)
 */
const ChatContent = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { threadId } = useParams()

  const { threads } = useSelector((state) => state[ct.store.CHAT_STORE])

  // Find the active thread
  const activeThread = threadId ? threads.find((t) => t.id === threadId) : null

  const handleNewChat = useCallback(() => {
    const id = Date.now().toString()
    dispatch(createThread({ id, title: "New Chat" }))
    navigate(`/chat/${id}`)
  }, [dispatch, navigate])

  const handleSendMessage = useCallback(
    async (message) => {
      // If no active thread, create one then send
      if (!activeThread) {
        const newId = Date.now().toString()
        dispatch(
          createThread({ id: newId, title: `${message.slice(0, 50)}...` })
        )
        navigate(`/chat/${newId}`)
        await dispatch(sendMessageThunk(newId, message))
      } else {
        await dispatch(sendMessageThunk(activeThread.id, message))
      }
    },
    [dispatch, navigate, activeThread]
  )

  return (
    <div className="flex flex-col h-full">
      {activeThread ? (
        <MessageView thread={activeThread} />
      ) : (
        <EmptyChatView
          onNewChat={handleNewChat}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  )
}

export default ChatContent
