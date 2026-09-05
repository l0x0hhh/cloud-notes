import { useState, useEffect, useCallback, useRef } from 'react'
import { useNotesStore } from '@/store/notesStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

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

  useEffect(() => {
    if (error) {
      toast('error', error)
    }
  }, [error, toast])

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
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="p-4 rounded-[28px] bg-card-glass/40 backdrop-blur-sm">
          <FileText className="w-16 h-16 text-muted/30" />
        </div>
        <p className="text-lg font-semibold text-foreground tracking-tight font-display">
          选择或创建一条笔记
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          从左侧列表中选择一条笔记开始编辑，或点击「新建笔记」创建全新的内容
        </p>
      </div>
    )
  }

  const handleSave = async () => {
    if (saving) return
    const ok = await updateNote()
    if (ok) {
      toast('success', '笔记已保存')
    } else {
      toast('error', '保存失败，请重试')
    }
  }

  const handleCreateNew = async () => {
    if (saving) return
    const id = await createNote()
    if (id) {
      toast('success', '笔记已创建')
    } else {
      toast('error', '创建失败，请重试')
    }
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
      <div className="px-4 pt-4 pb-2">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ title: e.target.value })}
          placeholder="笔记标题"
          className="w-full text-lg font-semibold bg-transparent border-0 text-foreground placeholder:text-muted/50 focus:outline-none px-0 py-1 font-display"
        />
      </div>

      <div className="px-4 pb-2">
        <Toolbar textareaRef={textareaRef} onInsert={handleToolbarInsert} />
      </div>

      <div className="flex-1 px-4 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={draft.content}
          onChange={(e) => setDraft({ content: e.target.value })}
          placeholder="使用 Markdown 记录你的想法..."
          className="w-full h-full bg-transparent border-0 text-foreground text-sm placeholder:text-muted/50 resize-none focus:outline-none leading-relaxed py-1 font-mono"
        />
      </div>

      <div className="px-4 py-3 border-t border-border/60 flex items-center gap-2 flex-wrap">
        <Button onClick={handleSave} loading={saving} size="sm" className="bg-linear border-0 shadow-soft-sm">
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
        <h1 className="text-2xl font-bold text-foreground mb-6 pb-4 border-b border-border/60 tracking-tight font-display">
          {draft.title}
        </h1>
      )}
      <MarkdownPreview content={draft.content} />
    </div>
  )

  return (
    <div className="h-full animate-fade-in flex flex-col p-2">
      <div className="card flex-1 overflow-hidden">
        <SplitView
          left={editorPane}
          right={previewPane}
          defaultRatio={0.5}
          minLeftPx={320}
          minRightPx={280}
        />
      </div>

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        noteTitle={draft.title || '未命名笔记'}
      />
    </div>
  )
}
