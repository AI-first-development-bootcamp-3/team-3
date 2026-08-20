import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

export interface ManualReportSelectOption {
  value: string
  label: string
}

interface Props {
  ariaLabel: string
  value: string
  options: ManualReportSelectOption[]
  disabled?: boolean
  placeholder?: string
  onChange: (value: string) => void
}

const MENU_GAP = 8

function ManualReportSelect({
  ariaLabel,
  value,
  options,
  disabled = false,
  placeholder = 'בחר',
  onChange,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    visibility: 'hidden',
    zIndex: 400,
  })

  const selected = options.find((option) => option.value === value)

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return

    const place = () => {
      if (!trigger.isConnected) return
      const rect = trigger.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + MENU_GAP,
        left: rect.left,
        width: rect.width,
        visibility: 'visible',
        zIndex: 400,
      })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown)
    }, 0)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`mr-project--desktop__select${selected ? ' mr-project--desktop__select--filled' : ''}${open ? ' mr-project--desktop__select--open' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-value={value}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (disabled) return
          setOpen((current) => !current)
        }}
      >
        {selected?.label ?? placeholder}
      </button>
      {open
        ? createPortal(
            <ul
              ref={menuRef}
              className="mr-project--desktop__menu"
              role="listbox"
              aria-label={ariaLabel}
              style={menuStyle}
            >
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    data-select-value={option.value}
                    className={`mr-project--desktop__menu-item${option.value === value ? ' mr-project--desktop__menu-item--active' : ''}`}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </>
  )
}

export default ManualReportSelect
