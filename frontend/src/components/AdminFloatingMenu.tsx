import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  anchor: HTMLElement
  onClose: () => void
  children: ReactNode
  labelledBy?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function AdminFloatingMenu({ anchor, onClose, children, labelledBy }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    visibility: 'hidden',
    zIndex: 90,
  })

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const place = () => {
      if (!anchor.isConnected) return
      const rect = anchor.getBoundingClientRect()
      const { width, height } = menu.getBoundingClientRect()
      const gap = 8
      const rtl = getComputedStyle(anchor).direction === 'rtl'
      let top = rect.bottom + gap
      if (top + height > window.innerHeight - gap) {
        top = Math.max(gap, rect.top - height - gap)
      }
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
  }, [anchor])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || anchor.contains(target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
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
  }, [anchor, onClose])

  return createPortal(
    <div ref={menuRef} className="admin-floating-menu" role="menu" aria-labelledby={labelledBy} style={style}>
      {children}
    </div>,
    document.body,
  )
}

export default AdminFloatingMenu
