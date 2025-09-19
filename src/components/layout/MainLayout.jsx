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
import { useSelector } from "react-redux"
import { Outlet, useLocation, useParams } from "react-router-dom"

import ModeToggle from "@/components/layout/header/ThemeSwitch"
import { SparklesText } from "@/components/magicui/sparkles-text"
import { Separator } from "@/components/ui/separator"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ReactQueryDevtools } from "@/lib/devtools"
import ct from "@constants"

import { Button } from "../ui/button"

import AppSidebar from "./AppSidebar"
import DevelopmentToolButton from "./DevelopmentToolButton"
import EventsHistorySheet from "./sheets/EventsHistorySheet"
import SettingsSheet from "./sheets/SettingsSheet"
import ThreadSettingsSheet from "./sheets/ThreadSettingsSheet"
import ViewGraphSheet from "./sheets/ViewGraphSheet"
import ViewMemorySheet from "./sheets/ViewMemorySheet"
import ViewStateSheet from "./sheets/ViewStateSheet"

/**
 * MainLayout component renders the main application layout with sidebar, header, and content area.
 * Includes developer tools: View State, View Memory, View Graph, and Events History.
 * Dev tools are disabled when backend URL is not configured.
 */
// eslint-disable-next-line max-lines-per-function
const MainLayout = () => {
  const [activeSheet, setActiveSheet] = useState(null)
  const location = useLocation()
  const { threadId } = useParams()
  const store = useSelector((st) => st[ct.store.SETTINGS_STORE])
  const chatStore = useSelector((st) => st[ct.store.CHAT_STORE])

  const isVerified = store?.verification?.isVerified ?? false

  // Check if we're on a thread page
  const isThreadPage = location.pathname.startsWith("/chat/") && threadId

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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />

        <main className="min-h-screen w-full">
          <div className="sticky top-0 z-50 w-full dark:shadow-secondary flex items-center p-4 bg-white dark:bg-[#020817] border-b dark:border-slate-800">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
              <span
                className="cursor-pointer"
                onClick={() => (window.location.pathname = "/")}
                tabIndex={0}
                role="button"
                aria-label="Go to home page"
              >
                <SparklesText className="text-lg">
                  PyAgenity Playground
                </SparklesText>
              </span>
            </div>

            <div className="flex items-center justify-center flex-1">
              {/* Thread Settings Button - Only visible on thread pages */}
              {isThreadPage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSheetOpen("thread")}
                  >
                    <MessageSquare className="h-4 w-4" /> Thread Details
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isThreadPage && (
                <DevelopmentToolButton
                  icon={Eye}
                  tooltip="View State"
                  handleActivate={() => handleSheetOpen("state")}
                  isActive={activeSheet === "state"}
                  disabled={!isVerified}
                />
              )}

              {isThreadPage && (
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
              <Separator orientation="vertical" className="h-6" />
              <DevelopmentToolButton
                icon={Settings}
                tooltip="Settings"
                handleActivate={() => handleSheetOpen("settings")}
                isActive={activeSheet === "settings"}
                disabled={false}
              />
              <ModeToggle />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex text-sm text-gray-500 dark:text-gray-400">
                <Github />{" "}
                <span className="ml-1">
                  <a
                    href="https://github.com/Iamsdt/PyAgenity"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    PyAgenity
                  </a>
                </span>
              </div>
            </div>
          </div>
          <div className="p-6">
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
