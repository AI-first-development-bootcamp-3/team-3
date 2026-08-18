import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  REPORT_STATUS_FILTERS,
  REPORT_STATUS_FILTER_LABELS,
  type ReportStatusFilter,
} from './reportStatusFilter'
import chevronSmall from '../assets/home/chevron-forward-small.svg'

type ReportStatusFilterMenuProps = {
  value: ReportStatusFilter
  onChange: (value: ReportStatusFilter) => void
}

/**
 * The **כל הדיווחים** pill. A native `<select>` cannot carry the Figma pill's
 * border, chevron, and RTL alignment, so the listbox keyboard behaviour is owned
 * here rather than inherited from the platform.
 */
function ReportStatusFilterMenu({ value, onChange }: ReportStatusFilterMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Moving focus onto the active option is what makes the arrow keys land
  // somewhere; the options are the tab stops while the list is open.
  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const openMenu = () => {
    const current = REPORT_STATUS_FILTERS.indexOf(value)
    setActiveIndex(current < 0 ? 0 : current)
    setOpen(true)
  }

  const closeMenu = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const count = REPORT_STATUS_FILTERS.length
      setActiveIndex((current) => (current + delta + count) % count)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(REPORT_STATUS_FILTERS.length - 1)
    }
  }

  return (
    <div className="home-shell__filter-wrap" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={triggerRef}
        className="home-shell__filter"
        data-testid="status-filter"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        {REPORT_STATUS_FILTER_LABELS[value]}
        <span
          className={`home-shell__filter-icon${open ? ' home-shell__filter-icon--open' : ''}`}
          aria-hidden="true"
        >
          <img src={chevronSmall} alt="" width={6} height={12} />
        </span>
      </button>

      {open ? (
        <div className="home-shell__filter-panel" role="listbox" aria-label="סינון לפי סטטוס">
          {REPORT_STATUS_FILTERS.map((option, index) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              className={`home-shell__filter-option${option === value ? ' home-shell__filter-option--active' : ''}`}
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              tabIndex={index === activeIndex ? 0 : -1}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                onChange(option)
                closeMenu()
              }}
            >
              {REPORT_STATUS_FILTER_LABELS[option]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default ReportStatusFilterMenu
