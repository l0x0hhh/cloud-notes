import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="grid gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-foreground tracking-tight"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground',
            'placeholder:text-muted',
            'transition-all duration-200',
            'focus:border-primary focus:ring-[3px] focus:ring-primary/15 focus:bg-card focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/15'
              : 'border-border hover:border-muted',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger mt-0.5 animate-fade-in">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="grid gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-foreground tracking-tight"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground resize-y min-h-[200px]',
            'placeholder:text-muted font-mono',
            'transition-all duration-200',
            'focus:border-primary focus:ring-[3px] focus:ring-primary/15 focus:bg-card focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/15'
              : 'border-border hover:border-muted',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger mt-0.5 animate-fade-in">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
export { Textarea }
