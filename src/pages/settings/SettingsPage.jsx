import AppearanceSection from "./components/AppearanceSection"
import ConnectionSection from "./components/ConnectionSection"
import styles from "./settings.module.css"

// Config hub: manage the active/saved backend connections (delegating deep
// add/edit to the Connect page) and the persisted theme. Everything here is
// stored locally in the browser.
/**
 *
 */
export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <h1>Settings</h1>
          <p>
            Manage your backend connection and appearance. Everything here is
            stored locally in this browser.
          </p>
        </header>
        <ConnectionSection />
        <AppearanceSection />
      </div>
    </div>
  )
}
