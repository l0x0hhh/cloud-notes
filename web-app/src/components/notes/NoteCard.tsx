import { cn } from '@/lib/utils'
import type { Note } from '@/types'
import { FileText } from 'lucide-react'

interface NoteCardProps {
  note: Note
  isActive: boolean
  onClick: () => void
}

export function NoteCard({ note, isActive, onClick }: NoteCardProps) {
  const created = note.CreatedAt
    ? new Date(note.CreatedAt).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl p-4 transition-all duration-200',
        'hover:bg-card-hover active:scale-[0.98]',
        isActive
          ? 'bg-card shadow-apple-md ring-1 ring-primary/30'
          : 'bg-transparent border border-transparent hover:border-border'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-xl shrink-0 mt-0.5 transition-colors',
            isActive ? 'bg-primary/15 text-primary' : 'bg-background-secondary text-muted'
          )}
        >
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate tracking-tight">
            {note.Title || '未命名笔记'}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {note.Content || '暂无内容'}
          </p>
          {created && (
            <span className="inline-block text-[11px] text-muted mt-2 font-medium">
              {created}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
