import { PanelsTopLeft } from "lucide-react"
import { useSelector } from "react-redux"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import ct from "@constants/"
import { changeSidebar } from "@store/slices/theme.slice"

import Menu from "./menu"
import SidebarToggle from "./sidebar-toggle"

const Sidebar = () => {
  const store = useSelector((st) => st[ct.store.THEME_STORE])

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300",
        store.sidebar === false ? "w-[90px]" : "w-72"
      )}
    >
      <SidebarToggle isOpen={store.sidebar} setIsOpen={changeSidebar} />
      <div className="relative h-full flex flex-col px-3 py-4 overflow-y-auto shadow-md dark:shadow-zinc-800">
        <Button
          className={cn(
            "transition-transform ease-in-out duration-300 mb-1",
            store.sidebar === false ? "translate-x-1" : "translate-x-0"
          )}
          variant="link"
          asChild
        >
          <Link to="/" className="flex items-center gap-2">
            <PanelsTopLeft className="w-6 h-6 mr-1" />
            <h1
              className={cn(
                "font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
                store.sidebar === false
                  ? "-translate-x-96 opacity-0 hidden"
                  : "translate-x-0 opacity-100"
              )}
            >
              Brand
            </h1>
          </Link>
        </Button>
        <Menu isOpen={store.sidebar} />
      </div>
    </aside>
  )
}

export default Sidebar
