import { useAuthStore } from '@/store/authStore'
import { useNotesStore } from '@/store/notesStore'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { FileText, LogOut, RefreshCw, User, Sun, Moon } from 'lucide-react'

export function AppShell() {
  const userId = useAuthStore((s) => s.userId)
  const logout = useAuthStore((s) => s.logout)
  const fetchNotes = useNotesStore((s) => s.fetchNotes)
  const loading = useNotesStore((s) => s.loading)
  const notesCount = useNotesStore((s) => s.notes.length)
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-[15px] font-semibold text-foreground truncate tracking-tight">
              Cloud Notes
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              <span className="inline-flex items-center gap-1">
                <User className="w-3 h-3" />
                {userId ?? '...'}
              </span>
              <span className="mx-1.5">·</span>
              {notesCount} 条笔记
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={toggle} title={theme === 'light' ? '切换暗色模式' : '切换亮色模式'}>
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNotes}
            loading={loading}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">刷新</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">退出</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
