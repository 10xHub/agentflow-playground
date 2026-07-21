import { createBrowserRouter } from "react-router-dom"

import ct from "@constants/"

import dashboardRoutes from "./main.routes"

import MainLayout from "@/components/layout/main-layout"

const router = createBrowserRouter([
  {
    path: ct.route.ROOT,
    element: <MainLayout />,
    children: dashboardRoutes,
  },
])

export default router
