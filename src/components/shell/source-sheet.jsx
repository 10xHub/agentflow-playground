import PropTypes from "prop-types"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"

import styles from "./DemoBanner.module.css"

/** The demo agent's graph.py in a side sheet. Code-split with its dialog. */
const SourceSheet = ({ open, source = null, onOpenChange }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className={styles.sheet}>
      <SheetTitle className={styles.sheetTitle}>demo/agent/graph.py</SheetTitle>
      <SheetDescription className={styles.sheetNote}>
        The whole agent behind this demo. Tools, the scripted MAIN node and the
        recorder sit next to it in demo/.
      </SheetDescription>
      <div className={styles.code}>
        <SyntaxHighlighter
          language="python"
          style={oneDark}
          customStyle={{ margin: 0, background: "transparent", fontSize: 12 }}
          codeTagProps={{ style: { background: "transparent" } }}
        >
          {source ?? "Loading…"}
        </SyntaxHighlighter>
      </div>
    </SheetContent>
  </Sheet>
)

SourceSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  source: PropTypes.string,
  onOpenChange: PropTypes.func.isRequired,
}

export default SourceSheet
