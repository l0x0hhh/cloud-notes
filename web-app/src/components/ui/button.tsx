import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]'

    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover shadow-apple-sm hover:shadow-apple-md',
      ghost:
        'bg-card text-foreground hover:bg-card-hover border border-border',
      danger:
        'bg-danger text-danger-foreground hover:bg-danger-hover shadow-apple-sm',
    }

    const sizes = {
      sm: 'px-3.5 py-1.5 text-xs',
      md: 'px-5 py-2 text-sm',
      lg: 'px-6 py-2.5 text-[15px]',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
