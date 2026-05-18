import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {/* Backdrop with glass effect */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-md bg-[#f5f5f7]/95 backdrop-blur-2xl border border-white/60 shadow-apple-xl rounded-[20px] p-6 animate-scale-in',
          className
        )}
      >
        {title && (
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-muted hover:text-foreground hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
