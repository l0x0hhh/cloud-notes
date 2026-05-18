import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg) / <alpha-value>)',
        'background-secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
        foreground: 'rgb(var(--fg) / <alpha-value>)',
        'foreground-secondary': 'rgb(var(--fg-secondary) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'card-hover': 'rgb(var(--card-hover) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-light': 'rgb(var(--border-light) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-fg) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          foreground: 'rgb(var(--primary-fg) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          hover: 'rgb(var(--danger-hover) / <alpha-value>)',
          foreground: 'rgb(var(--danger-fg) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          foreground: 'rgb(var(--success-fg) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'SF Pro Display', 'SF Pro Text', '-apple-system',
          'BlinkMacSystemFont', 'Helvetica Neue', 'PingFang SC',
          'Microsoft YaHei', 'sans-serif',
        ],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spring-in': 'springIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'calendar-day-pop-in': 'calendarDayPopIn 0.25s cubic-bezier(0.22, 0.99, 0.33, 0.97) forwards',
        'content-appear': 'contentAppear 0.35s ease-out forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        springIn: {
          '0%': { opacity: '0', transform: 'scale(0.88) translateY(8px)' },
          '60%': { opacity: '1', transform: 'scale(1.02) translateY(-2px)' },
          '100%': { transform: 'scale(1) translateY(0)' },
        },
        calendarDayPopIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        contentAppear: {
          '0%': { opacity: '0', transform: 'translateY(11px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'apple-sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'apple-md': '0 4px 12px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 12px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'apple-xl': '0 24px 48px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config
