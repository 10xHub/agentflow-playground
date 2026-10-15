// Must stay the first import: renames old localStorage keys before anything reads them.
import "./lib/storage-migration"

import React from "react"
import ReactDOM from "react-dom/client"

import App from "./App"
import { activeScenario } from "./lib/demo/demo-mode"
import { loadFixture } from "./lib/demo/fixtures"

import "./main.css"
import "./styles/tokens.css"

const render = () =>
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

// A reload inside the demo loads the recording before any page asks for data.
// If it fails, the app renders anyway and the connection shows the error.
const scenario = activeScenario()
const ready = scenario ? loadFixture(scenario) : Promise.resolve()
ready.finally(render).catch(() => {})
