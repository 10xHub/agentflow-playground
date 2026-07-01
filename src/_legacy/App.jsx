import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { Suspense } from "react"
import { Provider } from "react-redux"
import { RouterProvider } from "react-router-dom"
import { PersistGate } from "redux-persist/integration/react"

import { ThemeProvider } from "@/lib/context/theme-provider"
import { asyncStoragePersister, queryClient } from "@/lib/query-client"
import { store, persistor } from "@store/"

import router from "./route/index"

const App = () => {
  return (
    <Suspense fallback={null}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
          >
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </PersistQueryClientProvider>
        </PersistGate>
      </Provider>
    </Suspense>
  )
}

export default App
