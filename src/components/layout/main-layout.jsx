import {
  Eye,
  Database,
  GitGraph,
  History,
  Settings,
  Github,
  MessageSquare,
} from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import ModeToggle from "@/components/layout/header/theme-switch"
import { Separator } from "@/components/ui/separator"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ReactQueryDevtools } from "@/lib/devtools"
import { setActiveThread } from "@/services/store/slices/chat.slice"
import ct from "@constants"

import { Button } from "../ui/button"

import AppSidebar from "./app-sidebar"
import DevelopmentToolButton from "./development-tool-button"
import EventsHistorySheet from "./sheets/events-history-sheet"
import SettingsSheet from "./sheets/settings-sheet"
import ViewStateSheet from "./sheets/state"
import ThreadSettingsSheet from "./sheets/ThreadSettingsSheet"
import ViewGraphSheet from "./sheets/view-graph-sheet"
import ViewMemorySheet from "./sheets/view-memory-sheet"

/**
 * MainLayout component renders the main application layout with sidebar, header, and content area.
 * Includes developer tools: View State, View Memory, View Graph, and Events History.
 * Dev tools are disabled when backend URL is not configured.
 */
// eslint-disable-next-line max-lines-per-function, complexity
const MainLayout = () => {
  const [activeSheet, setActiveSheet] = useState(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])
  const chatStore = useSelector((st) => st[ct.store.CHAT_STORE])

  const isVerified = store?.verification?.isVerified ?? false

  // Get threadId from URL search params (dashboard uses query params)
  const searchParameters = new URLSearchParams(location.search)
  const threadId = searchParameters.get("threadId") || chatStore.activeThreadId

  // Check if we're on dashboard with an active thread (for showing thread-specific UI)
  const isChatPage = location.pathname === "/" && threadId && isVerified

  // Get thread data from Redux store
  const threadData = threadId
    ? chatStore.threads.find((t) => t.id === threadId)
    : null

  const handleSheetOpen = (sheetType) => {
    setActiveSheet(sheetType)
  }

  const handleSheetClose = () => {
    setActiveSheet(null)
  }

  const handleGoHome = () => {
    // Clear active thread and navigate to home page
    dispatch(setActiveThread(null))
    navigate("/")
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />

        <main className="flex flex-col h-screen w-full bg-background selection:bg-primary/20">
          <header className="sticky top-0 z-50 w-full flex items-center px-4 py-2.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
              <span
                className="cursor-pointer flex items-center gap-2 transition-opacity hover:opacity-80"
                onClick={handleGoHome}
                tabIndex={0}
                role="button"
                aria-label="Go to home page"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <GitGraph className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold tracking-tight">
                  AgentFlow Workbench
                </span>
              </span>
            </div>

            <div className="flex items-center justify-center flex-1">
              {/* Thread Settings Button - Only visible on thread pages */}
              {isChatPage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSheetOpen("thread")}
                    disabled={!isVerified}
                  >
                    <MessageSquare className="h-4 w-4" /> Thread Details
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isChatPage && (
                <DevelopmentToolButton
                  icon={Eye}
                  tooltip="View State"
                  handleActivate={() => handleSheetOpen("state")}
                  isActive={activeSheet === "state"}
                  disabled={!isVerified}
                />
              )}

              {isChatPage && (
                <DevelopmentToolButton
                  icon={Database}
                  tooltip="View Memory"
                  handleActivate={() => handleSheetOpen("memory")}
                  isActive={activeSheet === "memory"}
                  disabled={!isVerified}
                />
              )}

              <DevelopmentToolButton
                icon={GitGraph}
                tooltip="View Graph"
                handleActivate={() => handleSheetOpen("graph")}
                isActive={activeSheet === "graph"}
                disabled={!isVerified}
              />
              <DevelopmentToolButton
                icon={History}
                tooltip="Events History"
                handleActivate={() => handleSheetOpen("history")}
                isActive={activeSheet === "history"}
                disabled={!isVerified}
              />
              <Separator
                orientation="vertical"
                className="h-4 bg-border/60 mx-1"
              />
              <DevelopmentToolButton
                icon={Settings}
                tooltip="Settings"
                handleActivate={() => handleSheetOpen("settings")}
                isActive={activeSheet === "settings"}
                disabled={false}
              />
              <ModeToggle />
              <Separator
                orientation="vertical"
                className="h-4 bg-border/60 mx-1"
              />
              <div className="flex text-sm text-gray-500 dark:text-gray-400">
                <Github />{" "}
                <span className="ml-1">
                  <a
                    href="https://github.com/Iamsdt/PyAgenity"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    AgentFlow
                  </a>
                </span>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
          <ViewStateSheet
            isOpen={activeSheet === "state"}
            onClose={handleSheetClose}
          />
          <ViewMemorySheet
            isOpen={activeSheet === "memory"}
            onClose={handleSheetClose}
          />
          <ViewGraphSheet
            isOpen={activeSheet === "graph"}
            onClose={handleSheetClose}
          />
          <EventsHistorySheet
            isOpen={activeSheet === "history"}
            onClose={handleSheetClose}
          />
          <SettingsSheet
            isOpen={activeSheet === "settings"}
            onClose={handleSheetClose}
          />
          <ThreadSettingsSheet
            isOpen={activeSheet === "thread"}
            onClose={handleSheetClose}
            threadId={threadId}
            threadData={threadData}
          />
          <Toaster />
        </main>
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default MainLayout
