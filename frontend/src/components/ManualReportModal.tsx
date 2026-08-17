import type { ReactNode } from 'react'
import './ManualReportModal.css'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelId?: string
}

/** RTL split-view side panel — Figma frame 1:17385. Home stays visible beside the form. */
function ManualReportModal({ open, onClose, children, labelId }: Props) {
  if (!open) return null

  return (
    <aside
      className="mr-side-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelId}
    >
      <div className="mr-side-panel__inner">{children}</div>
      <button type="button" className="mr-side-panel__sr-close" onClick={onClose}>
        סגירת דיווח ידני
      </button>
    </aside>
  )
}

export default ManualReportModal
