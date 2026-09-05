import { useMemo } from 'react'
import { useNotesStore } from '@/store/notesStore'
import { NoteCard } from './NoteCard'
import { NoteCardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Search, Plus, Inbox } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useState } from 'react'

export function NoteList() {
  const notes = useNotesStore((s) => s.notes)
  const selectedId = useNotesStore((s) => s.selectedId)
  const selectNote = useNotesStore((s) => s.selectNote)
  const createNote = useNotesStore((s) => s.createNote)
  const saving = useNotesStore((s) => s.saving)
  const loading = useNotesStore((s) => s.loading)
  const clearDraft = useNotesStore((s) => s.clearDraft)
  const setDraft = useNotesStore((s) => s.setDraft)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return notes
    const q = debouncedSearch.toLowerCase()
    return notes.filter(
      (n) =>
        n.Title.toLowerCase().includes(q) ||
        n.Content.toLowerCase().includes(q)
    )
  }, [notes, debouncedSearch])

  return (
    <aside className="flex flex-col h-full bg-background-secondary/40">
      {/* Search + Create */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-9 pr-3 py-2.5 bg-card-glass/50 border border-border/80 rounded-2xl text-sm text-foreground placeholder:text-muted focus:border-brand focus:ring-[3px] focus:ring-brand/15 focus:bg-card-glass focus:outline-none transition-all backdrop-blur-sm"
          />
        </div>
        <Button
          className="w-full bg-linear border-0 shadow-soft-sm"
          size="sm"
          onClick={async () => {
            clearDraft()
            setDraft({ title: '', content: '' })
            await createNote()
          }}
          loading={saving}
        >
          <Plus className="w-4 h-4" />
          新建笔记
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <NoteCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
            <Inbox className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium text-muted-foreground">
              {debouncedSearch ? '没有匹配的笔记' : '暂无笔记'}
            </p>
            <p className="text-xs opacity-50">
              {debouncedSearch ? '尝试其他关键词' : '点击上方按钮创建第一条'}
            </p>
          </div>
        ) : (
          filtered.map((note) => (
            <NoteCard
              key={note.ID}
              note={note}
              isActive={String(note.ID) === selectedId}
              onClick={() => selectNote(String(note.ID))}
            />
          ))
        )}
      </div>
    </aside>
  )
}
