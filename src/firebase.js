import { initializeAnalytics, isSupported } from "firebase/analytics"
import { initializeApp } from "firebase/app"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID,
} = import.meta.env

const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID,
  measurementId: VITE_FIREBASE_MEASUREMENT_ID,
}

// Analytics is production-only: dev servers (ours and every contributor's)
// must not pollute the numbers. It is also opt-in by config — a clone with no
// .env initializes nothing and makes no network calls.
const enabled = Boolean(
  import.meta.env.PROD && VITE_FIREBASE_API_KEY && VITE_FIREBASE_MEASUREMENT_ID
)

const app = enabled ? initializeApp(firebaseConfig) : null

let analyticsPromise = null

// Memoized. Resolves to null (never rejects) when disabled or when the browser
// lacks Analytics support — private mode, no IndexedDB, the test environment.
const getAnalyticsInstance = () => {
  analyticsPromise ??= (async () => {
    if (!app) return null
    try {
      if (!(await isSupported())) return null
      // send_page_view: false — the SPA logs its own page_view on every route
      // change (see lib/use-analytics-page-views.js). Leaving gtag's automatic
      // one on would count every view twice.
      return initializeAnalytics(app, { config: { send_page_view: false } })
    } catch {
      return null
    }
  })()
  return analyticsPromise
}

export { app, firebaseConfig, getAnalyticsInstance }
