import { useEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react'
import { createPortal } from 'react-dom'
import './ManualReportModal.css'

const SLIDE_MS = 280

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelId?: string
}

/** Overlay drawer that slides in from off-screen and back out on close. */
function ManualReportModal({ open, onClose, children, labelId }: Props) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const heldChildren = useRef(children)

  if (open) heldChildren.current = children
  if (!mounted && !open) heldChildren.current = null

  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true))
      })
      return () => window.cancelAnimationFrame(frame)
    }

    setEntered(false)
    const timeout = window.setTimeout(() => setMounted(false), SLIDE_MS)
    return () => window.clearTimeout(timeout)
  }, [open])

  const finishExit = (event: TransitionEvent<HTMLElement>) => {
    if (event.propertyName !== 'transform') return
    if (!open) setMounted(false)
  }

  if (!mounted) return null

  return createPortal(
    <aside
      className={`mr-side-panel${entered ? ' mr-side-panel--open' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelId}
      onTransitionEnd={finishExit}
    >
      <div className="mr-side-panel__inner">{heldChildren.current}</div>
      <button type="button" className="mr-side-panel__sr-close" onClick={onClose}>
        סגירת דיווח ידני
      </button>
    </aside>,
    document.body,
  )
}

export default ManualReportModal
