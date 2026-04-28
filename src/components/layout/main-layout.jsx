import {
  Eye,
  Database,
  GitGraph,
  History,
  Settings,
  Github,
  MessageSquare,
} from "lucide-react"
import PropTypes from "prop-types"
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
import ThreadSettingsSheet from "./sheets/thread-settings-sheet"
import ViewGraphSheet from "./sheets/view-graph-sheet"
import ViewMemorySheet from "./sheets/view-memory-sheet"

/**
 * MainLayout component renders the main application layout with sidebar, header, and content area.
 * Includes developer tools: View State, View Memory, View Graph, and Events History.
 * Dev tools are disabled when backend URL is not configured.
 */

const MainHeaderCenter = ({ isChatPage, isVerified, onSheetOpen }) => {
  if (!isChatPage) return null
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSheetOpen("thread")}
        disabled={!isVerified}
      >
        <MessageSquare className="h-4 w-4" /> Thread Details
      </Button>
    </div>
  )
}

MainHeaderCenter.propTypes = {
  isChatPage: PropTypes.bool.isRequired,
  isVerified: PropTypes.bool.isRequired,
  onSheetOpen: PropTypes.func.isRequired,
}

const MainHeaderTools = ({
  isChatPage,
  isVerified,
  activeSheet,
  onSheetOpen,
}) => (
  <div className="flex items-center gap-2">
    {isChatPage && (
      <DevelopmentToolButton
        icon={Eye}
        tooltip="View State"
        handleActivate={() => onSheetOpen("state")}
        isActive={activeSheet === "state"}
        disabled={!isVerified}
      />
    )}
    {isChatPage && (
      <DevelopmentToolButton
        icon={Database}
        tooltip="View Memory"
        handleActivate={() => onSheetOpen("memory")}
        isActive={activeSheet === "memory"}
        disabled={!isVerified}
      />
    )}
    <DevelopmentToolButton
      icon={GitGraph}
      tooltip="View Graph"
      handleActivate={() => onSheetOpen("graph")}
      isActive={activeSheet === "graph"}
      disabled={!isVerified}
    />
    <DevelopmentToolButton
      icon={History}
      tooltip="Events History"
      handleActivate={() => onSheetOpen("history")}
      isActive={activeSheet === "history"}
      disabled={!isVerified}
    />
    <Separator orientation="vertical" className="h-4 bg-border/60 mx-1" />
    <DevelopmentToolButton
      icon={Settings}
      tooltip="Settings"
      handleActivate={() => onSheetOpen("settings")}
      isActive={activeSheet === "settings"}
      disabled={false}
    />
    <ModeToggle />
    <Separator orientation="vertical" className="h-4 bg-border/60 mx-1" />
    <div className="flex text-sm text-gray-500 dark:text-gray-400">
      <Github />
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
)

MainHeaderTools.propTypes = {
  isChatPage: PropTypes.bool.isRequired,
  isVerified: PropTypes.bool.isRequired,
  activeSheet: PropTypes.string,
  onSheetOpen: PropTypes.func.isRequired,
}

MainHeaderTools.defaultProps = {
  activeSheet: null,
}

const AllSheets = ({ activeSheet, onSheetClose, threadId, threadData }) => {
  const handleSheetClose = onSheetClose
  return (
    <>
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
    </>
  )
}

AllSheets.propTypes = {
  activeSheet: PropTypes.string,
  onSheetClose: PropTypes.func.isRequired,
  threadId: PropTypes.string,
  threadData: PropTypes.object,
}

AllSheets.defaultProps = {
  activeSheet: null,
  threadId: null,
  threadData: null,
}

const MainLayout = () => {
  const [activeSheet, setActiveSheet] = useState(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])
  const chatStore = useSelector((st) => st[ct.store.CHAT_STORE])

  const isVerified = store?.verification?.isVerified ?? false
  const searchParameters = new URLSearchParams(location.search)
  const threadId = searchParameters.get("threadId") || chatStore.activeThreadId
  const isChatPage = location.pathname === "/" && threadId && isVerified
  const threadData = threadId
    ? chatStore.threads.find((t) => t.id === threadId)
    : null

  const handleSheetOpen = (sheetType) => setActiveSheet(sheetType)
  const handleSheetClose = () => setActiveSheet(null)

  const handleGoHome = () => {
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
              <MainHeaderCenter
                isChatPage={Boolean(isChatPage)}
                isVerified={isVerified}
                onSheetOpen={handleSheetOpen}
              />
            </div>
            <MainHeaderTools
              isChatPage={Boolean(isChatPage)}
              isVerified={isVerified}
              activeSheet={activeSheet}
              onSheetOpen={handleSheetOpen}
            />
          </header>
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
          <AllSheets
            activeSheet={activeSheet}
            onSheetClose={handleSheetClose}
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
