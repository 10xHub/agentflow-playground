import { ArrowLeftFromLine, MenuIcon, PanelsTopLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toggleSidebar } from "@/services/store/slices/theme.slice"
import ct from "@constants/"

import Menu from "./menu"

/**
 * SheetMenu component for rendering the sidebar menu in a sheet.
 */
const SheetMenu = () => {
  const store = useSelector((st) => st[ct.store.THEME_STORE])
  const dispatch = useDispatch()
  const [isDialogOpen, setIsDialogOpen] = useState(true)
  const [isOpen, setsOpen] = useState(false)

  useEffect(() => {
    dispatch(toggleSidebar(""))
  }, [dispatch])

  /**
   * Prevents default event behavior and stops propagation.
   */
  const preventEvents = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDialogOpen(true)
  }

  const handleHamburgerOpen = (event) => {
    preventEvents(event)
    dispatch(toggleSidebar("open"))
    setsOpen(true)
  }

  const handleHamburgerClose = (event) => {
    preventEvents(event)
    dispatch(toggleSidebar(""))
    setsOpen(false)
  }

  const handleInteractOutside = (event) => {
    event.preventDefault()
  }

  return (
    <Sheet open={isDialogOpen} data-state="open">
      <SheetTrigger asChild>
        <Button className="h-8" variant="outline" size="icon">
          {store?.isSidebarOpn ? (
            <ArrowLeftFromLine size={20} onClick={handleHamburgerClose} />
          ) : (
            <MenuIcon size={20} onClick={handleHamburgerOpen} />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        onInteractOutside={handleInteractOutside}
        className={`${store?.isSidebarOpn ? "w-64" : "w-24"} transition-[width] duration-300 px-3 h-full flex flex-col`}
        side="left"
      >
        <SheetHeader>
          <Button
            className="flex justify-center items-center pb-2 pt-1"
            variant="link"
            asChild
          >
            <Link to="/dashboard" className="flex items-center gap-2">
              <PanelsTopLeft className="w-6 h-6 mr-1" />
              <h1 className="font-bold text-lg">Hire10x</h1>
            </Link>
          </Button>
        </SheetHeader>
        <Menu store={store} isOpen={isOpen} />
      </SheetContent>
    </Sheet>
  )
}

export default SheetMenu
