import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  count: number
  label: string
  children: ReactNode
  pillClassName?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/**
 * +N pill whose hover/focus panel is portaled to `document.body`, so table
 * `overflow: auto` wrappers cannot clip it.
 */
function AdminPillOverflow({ count, label, children, pillClassName = '' }: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number>(undefined)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    visibility: 'hidden',
    zIndex: 90,
  })

  const show = () => {
    window.clearTimeout(closeTimerRef.current)
    setOpen(true)
  }

  const hideSoon = () => {
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120)
  }

  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const anchor = anchorRef.current
    if (!panel || !anchor) return

    const place = () => {
      if (!anchor.isConnected) return
      const rect = anchor.getBoundingClientRect()
      const { width, height } = panel.getBoundingClientRect()
      const gap = 6
      const rtl = getComputedStyle(anchor).direction === 'rtl'
      let top = rect.top - height - gap
      if (top < gap) top = Math.min(window.innerHeight - height - gap, rect.bottom + gap)
      const preferredLeft = rtl ? rect.right - width : rect.left
      const left = clamp(preferredLeft, gap, Math.max(gap, window.innerWidth - width - gap))
      setStyle({
        position: 'fixed',
        top,
        left,
        visibility: 'visible',
        zIndex: 90,
      })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return (
    <>
      <span
        ref={anchorRef}
        className={`admin-pill admin-pill--more${pillClassName ? ` ${pillClassName}` : ''}`}
        tabIndex={0}
        aria-label={label}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onFocus={show}
        onBlur={hideSoon}
      >
        +{count}
      </span>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="admin-pill__everyone admin-pill__everyone--floating"
              role="tooltip"
              style={style}
              onMouseEnter={show}
              onMouseLeave={hideSoon}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export default AdminPillOverflow
