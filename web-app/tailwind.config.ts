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
        'card-glass': 'rgb(var(--card-glass) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-light': 'rgb(var(--border-light) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-fg) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--brand-foreground) / <alpha-value>)',
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
          'PingFang SC', '-apple-system', 'system-ui', 'Segoe UI', 'Roboto',
          'Ubuntu', 'Cantarell', 'Noto Sans', 'sans-serif',
          'BlinkMacSystemFont', 'Helvetica Neue', 'Hiragino Sans GB',
          'Microsoft YaHei', 'Arial',
        ],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        display: ['Averia Gruesa Libre', 'PingFang SC', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-in': 'springIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        heartbeat: 'heartbeat 0.8s ease-in-out',
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
        springIn: {
          '0%': { opacity: '0', transform: 'scale(0.88) translateY(8px)' },
          '60%': { opacity: '1', transform: 'scale(1.02) translateY(-2px)' },
          '100%': { transform: 'scale(1) translateY(0)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '20%': { transform: 'scale(1.15)' },
          '40%': { transform: 'scale(1)' },
          '60%': { transform: 'scale(1.15)' },
          '80%': { transform: 'scale(1)' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        'soft-sm': '0 2px 8px rgba(0,0,0,0.04)',
        'soft-md': '0 8px 24px rgba(0,0,0,0.05)',
        'soft-lg': '0 40px 50px -32px rgba(0,0,0,0.05)',
        'soft-xl': '0 60px 80px -40px rgba(0,0,0,0.06)',
        'glass': '0 40px 50px -32px rgba(0,0,0,0.05), inset 0 0 20px rgba(255,255,255,0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config
