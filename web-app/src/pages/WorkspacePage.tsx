import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { NoteList } from '@/components/notes/NoteList'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { useNotesStore } from '@/store/notesStore'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { List, X } from 'lucide-react'

export function WorkspacePage() {
  const fetchNotes = useNotesStore((s) => s.fetchNotes)
  const error = useNotesStore((s) => s.error)
  const { toast } = useToast()
  const token = useAuthStore((s) => s.token)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    if (token) {
      fetchNotes()
    }
  }, [token])

  useEffect(() => {
    if (error) {
      toast('error', error)
    }
  }, [error, toast])

  return (
    <div className="flex flex-col h-screen overflow-hidden animate-fade-in">
      <AppShell />

      {/* Mobile toggle */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-border-light/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSidebar((v) => !v)}
        >
          {showSidebar ? (
            <>
              <X className="w-4 h-4" />
              关闭列表
            </>
          ) : (
            <>
              <List className="w-4 h-4" />
              笔记列表
            </>
          )}
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            showSidebar ? 'flex' : 'hidden'
          } lg:flex overflow-hidden`}
        >
          <NoteList />
        </div>

        {/* Editor */}
        <div
          className={`${
            showSidebar ? 'hidden' : 'flex'
          } lg:flex overflow-hidden flex-col`}
        >
          <NoteEditor />
        </div>
      </div>
    </div>
  )
}
