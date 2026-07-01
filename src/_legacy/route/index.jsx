import { createBrowserRouter } from "react-router-dom"

import MainLayout from "@/components/layout/main-layout"
import ct from "@constants/"

import dashboardRoutes from "./main.routes"

const router = createBrowserRouter([
  {
    path: ct.route.ROOT,
    element: <MainLayout />,
    children: dashboardRoutes,
  },
])

export default router
