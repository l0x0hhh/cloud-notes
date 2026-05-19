import { useAuthStore } from '@/store/authStore'
import { useNotesStore } from '@/store/notesStore'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { FileText, LogOut, RefreshCw, Sun, Moon } from 'lucide-react'

export function AppShell() {
  const logout = useAuthStore((s) => s.logout)
  const fetchNotes = useNotesStore((s) => s.fetchNotes)
  const loading = useNotesStore((s) => s.loading)
  const notesCount = useNotesStore((s) => s.notes.length)
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-5 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">
            Cloud Notes
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {notesCount} 条笔记
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={toggle} title={theme === 'light' ? '暗色模式' : '亮色模式'}>
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNotes}
              loading={loading}
              title="刷新"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} title="退出登录">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
