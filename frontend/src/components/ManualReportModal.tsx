import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import './ManualReportModal.css'

/** Length of the slide, matching the animations in ManualReportModal.css. The
 * owner needs it to know how long to keep the panel's content rendered for the
 * way out. */
export const SLIDE_MS = 280

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelId?: string
}

/**
 * Overlay drawer that slides in when mounted and back out when `open` turns
 * false.
 *
 * Deliberately holds no state of its own. The slide-out has to outlive the
 * panel's content, and the owner is the only place that can keep that content
 * rendered for it — so the owner mounts this only while it has something to
 * show and unmounts it SLIDE_MS after closing. That is what lets the entrance
 * be a plain CSS keyframe that runs on mount, instead of mounting first and
 * then flipping a class from an effect a frame later.
 */
function ManualReportModal({ open, onClose, children, labelId }: Props) {
  return createPortal(
    <aside
      className={`mr-side-panel${open ? '' : ' mr-side-panel--closing'}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelId}
    >
      <div className="mr-side-panel__inner">{children}</div>
      <button type="button" className="mr-side-panel__sr-close" onClick={onClose}>
        סגירת דיווח ידני
      </button>
    </aside>,
    document.body,
  )
}

export default ManualReportModal
