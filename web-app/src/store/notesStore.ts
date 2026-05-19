import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Note } from '@/types'

interface Draft {
  title: string
  content: string
}

interface NotesState {
  notes: Note[]
  selectedId: string | null
  draft: Draft
  searchQuery: string
  loading: boolean
  saving: boolean
  error: string | null

  fetchNotes: () => Promise<void>
  selectNote: (id: string) => Promise<void>
  createNote: () => Promise<string | null>
  updateNote: () => Promise<boolean>
  deleteNote: (id: string) => Promise<boolean>
  setDraft: (draft: Partial<Draft>) => void
  setSearch: (query: string) => void
  clearDraft: () => void
  clearError: () => void
  reset: () => void
}

const EMPTY_DRAFT: Draft = { title: '', content: '' }

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedId: null,
  draft: EMPTY_DRAFT,
  searchQuery: '',
  loading: false,
  saving: false,
  error: null,

  fetchNotes: async () => {
    set({ loading: true, error: null })
    try {
      const notes = await api.getNotes()
      const { selectedId } = get()

      // 如果选中的笔记不在当前列表中（如切换用户后残留的旧 ID），清空
      const stillExists = selectedId && notes.some((n) => String(n.ID) === selectedId)
      if (selectedId && !stillExists) {
        set({
          notes,
          loading: false,
          selectedId: null,
          draft: EMPTY_DRAFT,
        })
      } else {
        set({ notes, loading: false })
      }

      // 如果没有选中笔记且有笔记，默认选中第一条
      const { selectedId: currentId } = get()
      if (!currentId && notes.length > 0) {
        const first = notes[0]
        set({
          selectedId: String(first.ID),
          draft: { title: first.Title, content: first.Content },
        })
      }
    } catch (e: any) {
      set({ loading: false, error: e.message })
    }
  },

  selectNote: async (id) => {
    set({ selectedId: id, error: null })
    try {
      const note = await api.getNote(id)
      set({ draft: { title: note.Title, content: note.Content } })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  createNote: async () => {
    const { draft } = get()
    set({ saving: true, error: null })
    try {
      const res = await api.createNote(draft)
      const newNote = res.note
      set((state) => ({
        notes: [newNote, ...state.notes],
        selectedId: String(newNote.ID),
        draft: { title: newNote.Title, content: newNote.Content },
        saving: false,
      }))
      return String(newNote.ID)
    } catch (e: any) {
      set({ saving: false, error: e.message })
      return null
    }
  },

  updateNote: async () => {
    const { selectedId, draft, saving } = get()
    if (!selectedId || saving) return false
    set({ saving: true, error: null })
    try {
      await api.updateNote(selectedId, draft)
      set((state) => {
        const updated = state.notes.map((n) =>
          String(n.ID) === selectedId ? { ...n, Title: draft.title, Content: draft.content } : n
        )
        return { notes: updated, saving: false }
      })
      return true
    } catch (e: any) {
      set({ saving: false, error: e.message })
      return false
    }
  },

  deleteNote: async (id) => {
    set({ error: null })
    try {
      await api.deleteNote(id)
      set((state) => {
        const remaining = state.notes.filter((n) => String(n.ID) !== id)
        const nextSelected =
          state.selectedId === id
            ? remaining[0] ? String(remaining[0].ID) : null
            : state.selectedId
        const nextDraft = (() => {
          if (state.selectedId !== id) return state.draft
          const next = remaining[0]
          return next ? { title: next.Title, content: next.Content } : EMPTY_DRAFT
        })()
        return {
          notes: remaining,
          selectedId: nextSelected,
          draft: nextDraft,
        }
      })
      return true
    } catch (e: any) {
      set({ error: e.message })
      return false
    }
  },

  setDraft: (partial) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),

  setSearch: (query) => set({ searchQuery: query }),

  clearDraft: () => set({ draft: EMPTY_DRAFT }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      notes: [],
      selectedId: null,
      draft: EMPTY_DRAFT,
      searchQuery: '',
      loading: false,
      saving: false,
      error: null,
    }),
}))
