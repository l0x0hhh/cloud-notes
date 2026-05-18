import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNotesStore } from '@/store/notesStore'
import { useToast } from '@/components/ui/toast'
import { Trash2, AlertTriangle } from 'lucide-react'

interface DeleteConfirmProps {
  open: boolean
  onClose: () => void
  noteTitle: string
}

export function DeleteConfirm({ open, onClose, noteTitle }: DeleteConfirmProps) {
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const selectedId = useNotesStore((s) => s.selectedId)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!selectedId) return
    const ok = await deleteNote(selectedId)
    if (ok) {
      toast('success', '笔记已删除')
    } else {
      toast('error', useNotesStore.getState().error || '删除失败')
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="删除笔记"
      description="此操作不可撤销"
    >
      <div className="space-y-5 mt-2">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-danger/5 border border-danger/15">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              确定要删除「{noteTitle}」吗？
            </p>
            <p className="text-[13px] text-muted-foreground mt-1">
              删除后笔记将从服务器上永久移除，无法恢复。
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
            确认删除
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
