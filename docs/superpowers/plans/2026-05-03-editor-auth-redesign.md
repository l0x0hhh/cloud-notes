# Editor & Auth Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign auth page (login-first flow), editor (split-view + toolbar), and color system (warm dark theme).

**Architecture:** Foundation-first: update color tokens in Tailwind config, then CSS layer, then build new components (SplitView, Toolbar), then rewrite existing pages (AuthPage, NoteEditor), finally style-tune remaining UI. Each component is independent and testable via the dev server.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, react-markdown + remark-gfm, react-hook-form + zod, lucide-react

---

### Task 1: Warm Dark Color System

**Files:**
- Modify: `web-app/tailwind.config.ts`
- Modify: `web-app/src/index.css`

- [ ] **Step 1: Replace all color tokens in tailwind.config.ts**

Replace the entire `colors` block. Keep all other config (fontFamily, animation, keyframes, borderRadius, boxShadow) unchanged.

```ts
// web-app/tailwind.config.ts — replace the colors block inside theme.extend
colors: {
  background: '#1a1a18',
  'background-secondary': '#22201d',
  foreground: '#efe6d5',
  'foreground-secondary': '#a09880',
  card: '#252320',
  'card-hover': '#2d2a26',
  border: '#3a3530',
  'border-light': '#2e2a26',
  muted: '#8a7a60',
  'muted-foreground': '#8a7a60',
  primary: {
    DEFAULT: '#f59e0b',
    hover: '#d97706',
    foreground: '#1a1a18',
  },
  danger: {
    DEFAULT: '#ef4444',
    hover: '#dc2626',
    foreground: '#ffffff',
  },
  success: {
    DEFAULT: '#22c55e',
    foreground: '#1a1a18',
  },
},
```

- [ ] **Step 2: Update index.css base styles for dark theme**

Replace the `body` block and scrollbar styles inside `@layer base`:

```css
/* Replace the body block */
body {
  @apply bg-background text-foreground antialiased;
  margin: 0;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont,
    'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Replace scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  border: 2px solid transparent;
  background-clip: content-box;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.22);
  background-clip: content-box;
}
```

- [ ] **Step 3: Remove glass utility classes and update markdown-preview styles in index.css**

Replace the entire `@layer components` block:

```css
@layer components {
  /* Markdown preview — warm dark theme */
  .markdown-preview h1 {
    @apply text-2xl font-bold mt-8 mb-3 text-foreground tracking-tight;
  }

  .markdown-preview h2 {
    @apply text-xl font-semibold mt-6 mb-2 text-foreground tracking-tight;
  }

  .markdown-preview h3 {
    @apply text-lg font-semibold mt-5 mb-2 text-foreground;
  }

  .markdown-preview h4 {
    @apply text-base font-semibold mt-4 mb-1 text-foreground;
  }

  .markdown-preview p {
    @apply my-2 leading-relaxed text-foreground-secondary;
  }

  .markdown-preview ul,
  .markdown-preview ol {
    @apply my-2 pl-6 text-foreground-secondary;
  }

  .markdown-preview li {
    @apply my-1;
  }

  .markdown-preview blockquote {
    @apply border-l-[3px] border-primary/50 pl-4 my-4 text-muted-foreground;
    font-style: normal;
  }

  .markdown-preview code {
    @apply bg-primary/10 rounded-md px-1.5 py-0.5 text-sm font-mono text-primary;
  }

  .markdown-preview pre {
    @apply bg-background-secondary rounded-2xl p-5 my-4 overflow-x-auto border border-border;
  }

  .markdown-preview pre code {
    @apply bg-transparent p-0 text-foreground text-sm;
  }

  .markdown-preview a {
    @apply text-primary decoration-primary/30 underline-offset-2 hover:underline;
  }

  .markdown-preview table {
    @apply w-full my-4 border-collapse;
  }

  .markdown-preview th,
  .markdown-preview td {
    @apply border border-border px-4 py-2.5 text-left text-sm;
  }

  .markdown-preview th {
    @apply bg-background-secondary font-semibold text-foreground;
  }

  .markdown-preview td {
    @apply text-foreground-secondary;
  }

  .markdown-preview img {
    @apply max-w-full rounded-2xl my-3;
  }

  .markdown-preview hr {
    @apply border-border my-8;
  }

  .markdown-preview strong {
    @apply text-foreground font-semibold;
  }

  .markdown-preview input[type='checkbox'] {
    @apply mr-2 accent-primary;
  }
}
```

- [ ] **Step 4: Verify dev server starts without errors**

```bash
cd E:/cloud-notes/web-app && npx vite --host 2>&1 | head -5
```

Expected: Vite dev server starts. Kill after confirming.

- [ ] **Step 5: Commit**

```bash
git add web-app/tailwind.config.ts web-app/src/index.css
git commit -m "feat: replace color system with warm dark theme

- Background: cool gray -> warm dark (#1a1a18)
- Primary: Apple blue -> amber (#f59e0b)
- Cards, borders, text all shifted to warm palette
- Glass surfaces removed (incompatible with dark theme)
- Scrollbar restyled for dark backgrounds

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Update UI Primitives (Button, Input, Textarea)

**Files:**
- Modify: `web-app/src/components/ui/button.tsx`
- Modify: `web-app/src/components/ui/input.tsx`

- [ ] **Step 1: Update Button styles for dark theme**

Change the `ghost` variant and the `base` focus ring:

```tsx
// In button.tsx, change the variants object:
const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover shadow-apple-sm hover:shadow-apple-md',
  ghost:
    'bg-card text-foreground hover:bg-card-hover border border-border',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger-hover shadow-apple-sm',
}
```

Also change the focus ring in `base` from `outline-primary` to match dark theme — replace `focus-visible:outline-primary` with `focus-visible:outline-primary/70`:

```tsx
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]'
```

- [ ] **Step 2: Update Input and Textarea styles for dark theme**

Replace the input className template (the string starting with `'w-full rounded-xl border...'`):

```tsx
// Input:
'w-full rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground',
'placeholder:text-muted',
'transition-all duration-200',
'focus:border-primary focus:ring-[3px] focus:ring-primary/15 focus:bg-card focus:outline-none',
'disabled:opacity-50 disabled:cursor-not-allowed',
error
  ? 'border-danger focus:border-danger focus:ring-danger/15'
  : 'border-border hover:border-muted',
```

Replace the textarea className similarly:

```tsx
// Textarea:
'w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground resize-y min-h-[200px]',
'placeholder:text-muted font-mono',
'transition-all duration-200',
'focus:border-primary focus:ring-[3px] focus:ring-primary/15 focus:bg-card focus:outline-none',
'disabled:opacity-50 disabled:cursor-not-allowed',
error
  ? 'border-danger focus:border-danger focus:ring-danger/15'
  : 'border-border hover:border-muted',
```

- [ ] **Step 3: Verify types with tsc**

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 4: Commit**

```bash
git add web-app/src/components/ui/button.tsx web-app/src/components/ui/input.tsx
git commit -m "feat: update UI primitives for warm dark theme

- Button ghost: card bg, warm border
- Input/Textarea: card bg, warm border, amber focus ring

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: AppShell, NoteList, NoteCard Style Updates

**Files:**
- Modify: `web-app/src/components/layout/AppShell.tsx`
- Modify: `web-app/src/components/notes/NoteList.tsx`
- Modify: `web-app/src/components/notes/NoteCard.tsx`

- [ ] **Step 1: Update AppShell header styling**

Change `glass-strong` to `bg-card` and `border-black/5` to `border-border`:

```tsx
// In AppShell.tsx, the <header> element:
<header className="sticky top-0 z-40 bg-card border-b border-border">
```

Change the icon container from `bg-primary/10 text-primary` to `bg-primary/15 text-primary`:

```tsx
<div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
  <FileText className="w-5 h-5" />
</div>
```

- [ ] **Step 2: Update NoteList search input and sidebar background**

Sidebar bg: change `bg-background-secondary/50` to `bg-background-secondary`:

```tsx
// In NoteList.tsx:
<aside className="flex flex-col h-full bg-background-secondary">
```

Search input: update classes for dark theme:

```tsx
<input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="搜索笔记..."
  className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary/15 focus:bg-card focus:outline-none transition-all"
/>
```

Mobile toggle bar: change `border-border-light/50` to `border-border`:

```tsx
<div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-border">
```

- [ ] **Step 3: Update NoteCard styling for dark theme**

Replace the className logic:

```tsx
className={cn(
  'w-full text-left rounded-2xl p-4 transition-all duration-200',
  'hover:bg-card-hover active:scale-[0.98]',
  isActive
    ? 'bg-card shadow-apple-md ring-1 ring-primary/30'
    : 'bg-transparent border border-transparent hover:border-border'
)}
```

Replace the icon container:

```tsx
className={cn(
  'p-2 rounded-xl shrink-0 mt-0.5 transition-colors',
  isActive ? 'bg-primary/15 text-primary' : 'bg-background-secondary text-muted'
)}
```

- [ ] **Step 4: Verify types**

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add web-app/src/components/layout/AppShell.tsx web-app/src/components/notes/NoteList.tsx web-app/src/components/notes/NoteCard.tsx
git commit -m "feat: update shell, sidebar, and card styles for dark theme

- AppShell: card bg header, amber accent icon
- NoteList: darker sidebar, card-bg search input
- NoteCard: warmer active state, amber ring

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: AuthPage Rewrite — Login-First Flow

**Files:**
- Modify: `web-app/src/components/auth/AuthPage.tsx`
- Modify: `web-app/src/components/auth/LoginForm.tsx`
- Modify: `web-app/src/components/auth/RegisterForm.tsx`

- [ ] **Step 1: Rewrite AuthPage with login-first toggle and failure-to-register hint**

Write `web-app/src/components/auth/AuthPage.tsx`:

```tsx
import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { FileText } from 'lucide-react'

export function AuthPage() {
  const [showLogin, setShowLogin] = useState(true)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
          <FileText className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Cloud Notes
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-card rounded-3xl shadow-apple-xl border border-border overflow-hidden animate-scale-in">
        {/* Amber accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-amber-400 to-primary/60" />

        <div className="p-8">
          {showLogin ? (
            <>
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-foreground tracking-tight">欢迎回来</h2>
                <p className="text-sm text-muted-foreground mt-1">登录你的账号继续使用</p>
              </div>
              <LoginForm onSwitchToRegister={() => setShowLogin(false)} />
              <p className="text-sm text-muted-foreground text-center mt-6">
                还没有账号？{' '}
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-primary hover:underline font-medium transition-colors"
                >
                  去注册
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-foreground tracking-tight">创建账号</h2>
                <p className="text-sm text-muted-foreground mt-1">注册一个新账号开始使用</p>
              </div>
              <RegisterForm onSwitchToLogin={() => setShowLogin(true)} />
              <p className="text-sm text-muted-foreground text-center mt-6">
                已有账号？{' '}
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-primary hover:underline font-medium transition-colors"
                >
                  去登录
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted text-center mt-6">
        登录即表示你同意服务条款。数据通过 JWT 认证保护。
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Update LoginForm to accept onSwitchToRegister prop and show failure hint**

Write `web-app/src/components/auth/LoginForm.tsx`:

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { LogIn } from 'lucide-react'

const schema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type FormData = z.infer<typeof schema>

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    const ok = await login(data.username.trim(), data.password)
    if (ok) {
      toast('success', '登录成功')
    } else {
      const msg = useAuthStore.getState().error || '登录失败'
      toast('error', msg)
      // After a short delay, suggest registration
      setTimeout(() => {
        toast('info', '还没有账号？点击下方「去注册」创建新账号')
      }, 1500)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="用户名"
        placeholder="请输入用户名"
        error={errors.username?.message}
        {...register('username')}
      />
      <Input
        label="密码"
        type="password"
        placeholder="请输入密码"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" className="w-full" loading={loading}>
        <LogIn className="w-4 h-4" />
        登录
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Update RegisterForm to accept onSwitchToLogin prop**

Write `web-app/src/components/auth/RegisterForm.tsx`:

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { UserPlus } from 'lucide-react'

const schema = z.object({
  username: z
    .string()
    .min(2, '用户名至少 2 个字符')
    .max(32, '用户名最多 32 个字符'),
  password: z
    .string()
    .min(6, '密码至少 6 个字符')
    .max(128, '密码最多 128 个字符'),
})

type FormData = z.infer<typeof schema>

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const registerUser = useAuthStore((s) => s.register)
  const loading = useAuthStore((s) => s.loading)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    const ok = await registerUser(data.username.trim(), data.password)
    if (ok) {
      toast('success', '注册成功，请登录')
      onSwitchToLogin()
    } else {
      toast('error', useAuthStore.getState().error || '注册失败')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="用户名"
        placeholder="2-32 个字符"
        error={errors.username?.message}
        {...register('username')}
      />
      <Input
        label="密码"
        type="password"
        placeholder="至少 6 个字符"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" className="w-full" loading={loading}>
        <UserPlus className="w-4 h-4" />
        注册
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Verify types**

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add web-app/src/components/auth/AuthPage.tsx web-app/src/components/auth/LoginForm.tsx web-app/src/components/auth/RegisterForm.tsx
git commit -m "feat: rewrite auth page with login-first flow

- Single centered card with amber accent bar
- Login shown by default, register is secondary
- Login failure shows registration hint after delay
- Register success auto-switches to login view

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: New SplitView Component (Draggable Panes)

**Files:**
- Create: `web-app/src/components/ui/split-view.tsx`

- [ ] **Step 1: Create SplitView component**

Write `web-app/src/components/ui/split-view.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify types**

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web-app/src/components/ui/split-view.tsx
git commit -m "feat: add SplitView component with draggable divider

- Resizable left/right panes via mouse drag
- Ratio persisted to localStorage
- Min-width constraints for both panes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: New Toolbar Component (Markdown Formatting)

**Files:**
- Create: `web-app/src/components/notes/Toolbar.tsx`

- [ ] **Step 1: Create Toolbar component**

Write `web-app/src/components/notes/Toolbar.tsx`:

```tsx
import { cn } from '@/lib/utils'
import {
  Heading1, Heading2, Heading3,
  Bold, Italic, Strikethrough,
  Quote, Code2, Minus,
  List, ListOrdered, CheckSquare,
  Table2, Link, Image,
} from 'lucide-react'

interface ToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onInsert: (before: string, after?: string, placeholder?: string) => void
}

interface ToolGroup {
  tools: {
    icon: React.ElementType
    label: string
    before: string
    after?: string
    placeholder?: string
    block?: boolean
  }[]
}

const groups: ToolGroup[] = [
  {
    tools: [
      { icon: Heading1, label: '一级标题', before: '# ', block: true },
      { icon: Heading2, label: '二级标题', before: '## ', block: true },
      { icon: Heading3, label: '三级标题', before: '### ', block: true },
    ],
  },
  {
    tools: [
      { icon: Bold, label: '加粗', before: '**', after: '**', placeholder: '加粗文字' },
      { icon: Italic, label: '斜体', before: '*', after: '*', placeholder: '斜体文字' },
      { icon: Strikethrough, label: '删除线', before: '~~', after: '~~', placeholder: '删除文字' },
    ],
  },
  {
    tools: [
      { icon: Quote, label: '引用', before: '> ', block: true },
      { icon: Code2, label: '代码块', before: '```\n', after: '\n```', placeholder: '代码' },
      { icon: Minus, label: '分隔线', before: '\n---\n' },
    ],
  },
  {
    tools: [
      { icon: List, label: '无序列表', before: '- ', block: true },
      { icon: ListOrdered, label: '有序列表', before: '1. ', block: true },
      { icon: CheckSquare, label: '待办', before: '- [ ] ', block: true },
    ],
  },
  {
    tools: [
      { icon: Table2, label: '表格', before: '\n| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |\n' },
      { icon: Link, label: '链接', before: '[', after: '](url)', placeholder: '链接文字' },
      { icon: Image, label: '图片', before: '![', after: '](url)', placeholder: '图片描述' },
    ],
  },
]

export function Toolbar({ textareaRef, onInsert }: ToolbarProps) {
  const handleTool = (tool: ToolGroup['tools'][number]) => {
    const ta = textareaRef.current
    if (!ta) {
      onInsert(tool.before, tool.after, tool.placeholder)
      return
    }

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.substring(start, end)
    const hasSelection = start !== end

    if (tool.block) {
      // Block-level: insert at start of current line
      const before = ta.value.substring(0, start)
      const lineStart = before.lastIndexOf('\n', start - 1) + 1
      ta.setRangeText(tool.before, lineStart, lineStart, 'end')
      ta.focus()
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      return
    }

    if (hasSelection && tool.after !== undefined) {
      // Wrap selection
      ta.setRangeText(tool.before + selected + (tool.after || ''), start, end, 'select')
    } else if (tool.after !== undefined) {
      // Insert with placeholder
      const placeholder = tool.placeholder || ''
      ta.setRangeText(tool.before + placeholder + tool.after, start, end, 'select')
    } else {
      // Plain insert
      ta.setRangeText(tool.before, start, end, 'end')
    }

    ta.focus()
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-background-secondary/60 rounded-2xl border border-border overflow-x-auto">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <div className="w-px h-5 bg-border mx-1 shrink-0" />}
          {group.tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              title={tool.label}
              onClick={() => handleTool(tool)}
              className={cn(
                'p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors',
                'focus:outline-none focus:ring-1 focus:ring-primary/50'
              )}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web-app/src/components/notes/Toolbar.tsx
git commit -m "feat: add markdown formatting toolbar

- Groups: headings, inline format, block elements, lists, insert
- Handles text selection wrapping and block-level insertion
- Icon-only buttons with tooltips, compact widget styling

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: NoteEditor Rewrite — Split View + Toolbar

**Files:**
- Modify: `web-app/src/components/notes/NoteEditor.tsx`

- [ ] **Step 1: Rewrite NoteEditor with split view and toolbar**

Write `web-app/src/components/notes/NoteEditor.tsx`:

```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNotesStore } from '@/store/notesStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { NoteEditorSkeleton } from '@/components/ui/skeleton'
import { MarkdownPreview } from './MarkdownPreview'
import { DeleteConfirm } from './DeleteConfirm'
import { Toolbar } from './Toolbar'
import { SplitView } from '@/components/ui/split-view'
import { Save, Trash2, FileText, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

export function NoteEditor() {
  const selectedId = useNotesStore((s) => s.selectedId)
  const draft = useNotesStore((s) => s.draft)
  const loading = useNotesStore((s) => s.loading)
  const saving = useNotesStore((s) => s.saving)
  const error = useNotesStore((s) => s.error)
  const setDraft = useNotesStore((s) => s.setDraft)
  const updateNote = useNotesStore((s) => s.updateNote)
  const createNote = useNotesStore((s) => s.createNote)
  const { toast } = useToast()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const debouncedDraft = useDebounce(draft, 2000)

  // Auto-save draft to localStorage
  useEffect(() => {
    if (selectedId) {
      try {
        localStorage.setItem(
          `draft_${selectedId}`,
          JSON.stringify(debouncedDraft)
        )
      } catch { /* ignore */ }
    }
  }, [debouncedDraft, selectedId])

  // Show errors as toasts
  useEffect(() => {
    if (error) {
      toast('error', error)
    }
  }, [error, toast])

  // Keyboard shortcut: Ctrl+S to save
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (selectedId) {
          updateNote().then((ok) => {
            if (ok) toast('success', '笔记已保存')
          })
        } else {
          createNote().then((id) => {
            if (id) toast('success', '笔记已创建')
          })
        }
      }
    },
    [selectedId, updateNote, createNote, toast]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (loading) return <NoteEditorSkeleton />

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted gap-4 p-8">
        <div className="p-4 rounded-2xl bg-background-secondary">
          <FileText className="w-16 h-16 opacity-15" />
        </div>
        <p className="text-lg font-semibold text-foreground tracking-tight">
          选择或创建一条笔记
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          从左侧列表中选择一条笔记开始编辑，或点击「新建笔记」创建全新的内容
        </p>
      </div>
    )
  }

  const handleSave = async () => {
    const ok = await updateNote()
    if (ok) toast('success', '笔记已保存')
  }

  const handleCreateNew = async () => {
    const id = await createNote()
    if (id) toast('success', '笔记已创建')
  }

  const handleToolbarInsert = (before: string, after?: string, placeholder?: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.substring(start, end)
    if (after !== undefined && selected) {
      ta.setRangeText(before + selected + after, start, end, 'select')
    } else if (after !== undefined) {
      ta.setRangeText(before + (placeholder || '') + after, start, end, 'select')
    } else {
      ta.setRangeText(before, start, end, 'end')
    }
    ta.focus()
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const editorPane = (
    <div className="flex flex-col h-full">
      {/* Title input */}
      <div className="px-4 pt-4 pb-2">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ title: e.target.value })}
          placeholder="笔记标题"
          className="w-full text-lg font-semibold bg-transparent border-0 text-foreground placeholder:text-muted focus:outline-none px-0 py-1"
        />
      </div>

      {/* Toolbar */}
      <div className="px-4 pb-2">
        <Toolbar textareaRef={textareaRef} onInsert={handleToolbarInsert} />
      </div>

      {/* Textarea */}
      <div className="flex-1 px-4 overflow-hidden">
        <Textarea
          ref={textareaRef}
          value={draft.content}
          onChange={(e) => setDraft({ content: e.target.value })}
          placeholder="使用 Markdown 记录你的想法..."
          className="min-h-0 h-full border-0 bg-transparent shadow-none focus:ring-0 px-0 py-1 rounded-none resize-none !outline-none leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
        <Button onClick={handleSave} loading={saving} size="sm">
          <Save className="w-4 h-4" />
          保存
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCreateNew} loading={saving}>
          <Plus className="w-4 h-4" />
          保存为新笔记
        </Button>
        <div className="flex-1" />
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-4 h-4" />
          删除
        </Button>
      </div>
    </div>
  )

  const previewPane = (
    <div className="h-full overflow-y-auto px-5 py-4">
      {draft.title && (
        <h1 className="text-2xl font-bold text-foreground mb-6 pb-4 border-b border-border tracking-tight">
          {draft.title}
        </h1>
      )}
      <MarkdownPreview content={draft.content} />
    </div>
  )

  return (
    <div className="h-full animate-fade-in flex flex-col">
      <SplitView
        left={editorPane}
        right={previewPane}
        defaultRatio={0.5}
        minLeftPx={320}
        minRightPx={280}
      />

      {/* Delete Confirmation */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        noteTitle={draft.title || '未命名笔记'}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web-app/src/components/notes/NoteEditor.tsx
git commit -m "feat: rewrite editor with split view and toolbar

- Replace edit/preview tabs with side-by-side SplitView
- Add Toolbar above textarea for markdown formatting
- Title input moved inside editor pane
- Preview renders live alongside editor

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Cleanup Unused Code

**Files:**
- Modify: `web-app/src/components/ui/tabs.tsx` (keep for potential reuse, but verify no remaining consumers)

- [ ] **Step 1: Verify Tabs component has no consumers**

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

TypeScript will error if `Tabs` is imported anywhere now (since we removed its usage from both AuthPage and NoteEditor).

- [ ] **Step 2: If no consumers, delete tabs.tsx**

Only if Step 1 confirms zero imports:

```bash
rm web-app/src/components/ui/tabs.tsx
```

Then verify build:

```bash
cd E:/cloud-notes/web-app && npx tsc --noEmit
```

- [ ] **Step 3: Check for any remaining references to old color tokens or glass classes**

```bash
cd E:/cloud-notes/web-app && grep -r "glass\|border-light\|border-black\|bg-white\|bg-black" src/ --include="*.tsx" --include="*.ts"
```

Expected: No matches (or only false positives). If any remain, fix them to use warm dark tokens.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused Tabs component and verify no stale styles

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Visual Verification

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server**

```bash
cd E:/cloud-notes/web-app && npx vite --host 0.0.0.0
```

- [ ] **Step 2: Check Auth page**
  - Navigate to http://localhost:5173
  - Verify login form is shown by default (not register)
  - Click "去注册" — should switch to register form
  - Click "去登录" — should switch back to login
  - Enter invalid credentials, submit — should see error toast, then registration hint

- [ ] **Step 3: Check Editor**
  - Login with valid credentials
  - Select a note — should see split view with editor left, preview right
  - Drag the divider — panes should resize
  - Click toolbar buttons — should insert markdown syntax into textarea
  - Select text then click Bold/Italic — should wrap selection
  - Type markdown — preview should update live on the right
  - Click Save — should persist to server

- [ ] **Step 4: Check overall dark theme**
  - Background should be `#1a1a18` (warm near-black)
  - Cards should be `#252320` (warm dark gray)
  - Primary accents should be amber (`#f59e0b`)
  - Text should be warm off-white, not harsh white
  - No leftover light-theme elements (white inputs, light gray backgrounds)
