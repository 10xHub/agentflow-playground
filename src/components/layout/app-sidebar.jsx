import ThreadList from "@/components/threads/thread-list"
import { Sidebar, SidebarContent, SidebarGroup } from "@/components/ui/sidebar"

/**
 * AppSidebar component renders a collapsible sidebar with application navigation and chat threads.
 */
const AppSidebar = () => {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent className="overflow-hidden gap-0">
        {/* Chat Threads - only show thread list */}
        <SidebarGroup className="flex-1 p-0 min-h-0">
          <ThreadList className="h-full" />
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default AppSidebar
