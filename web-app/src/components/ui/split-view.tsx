import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SplitViewProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultRatio?: number // 0-1, fraction for left pane
  minLeftPx?: number
  minRightPx?: number
  storageKey?: string
}

export function SplitView({
  left,
  right,
  defaultRatio = 0.5,
  minLeftPx = 280,
  minRightPx = 280,
  storageKey = 'split-view-ratio',
}: SplitViewProps) {
  const [ratio, setRatio] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const n = parseFloat(saved)
        if (n > 0 && n < 1) return n
      }
    } catch { /* ignore */ }
    return defaultRatio
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const newRatio = Math.max(
        minLeftPx / rect.width,
        Math.min(1 - minRightPx / rect.width, x / rect.width)
      )
      setRatio(newRatio)
    }

    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try {
        localStorage.setItem(storageKey, String(ratio))
      } catch { /* ignore */ }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [ratio, minLeftPx, minRightPx, storageKey])

  // Persist on unmount
  useEffect(() => {
    return () => {
      try { localStorage.setItem(storageKey, String(ratio)) } catch { /* ignore */ }
    }
  }, [ratio, storageKey])

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      <div style={{ width: `${ratio * 100}%` }} className="h-full overflow-hidden">
        {left}
      </div>

      {/* Divider */}
      <div
        className={cn(
          'w-2 shrink-0 cursor-col-resize relative group',
          'bg-transparent hover:bg-primary/10 transition-colors',
          'flex items-center justify-center'
        )}
        onMouseDown={onMouseDown}
      >
        <div className="w-0.5 h-10 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
      </div>

      <div style={{ width: `${(1 - ratio) * 100}%` }} className="h-full overflow-hidden">
        {right}
      </div>
    </div>
  )
}
