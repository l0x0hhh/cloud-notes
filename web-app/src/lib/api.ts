import type { Note, CreateNotePayload } from '@/types'

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {}

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const authToken = options.token ?? this.token
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    const text = await res.text()
    const payload = text ? JSON.parse(text) : null

    if (!res.ok) {
      if (res.status === 401) {
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().logout()
      }
      const errMsg =
        payload?.error || payload?.message || `${res.status} ${res.statusText}`
      throw new Error(errMsg)
    }

    return payload as T
  }

  register = (username: string, password: string) =>
    this.request<{ message: string }>('/register', {
      method: 'POST',
      body: { username, password },
    })

  login = (username: string, password: string) =>
    this.request<{ token: string }>('/login', {
      method: 'POST',
      body: { username, password },
    })

  profile = () =>
    this.request<{ user_id: number }>('/api/profile')

  getNotes = () => this.request<Note[]>('/api/notes')

  getNote = (id: string) =>
    this.request<Note>(`/api/notes/${encodeURIComponent(id)}`)

  createNote = (payload: CreateNotePayload) =>
    this.request<{ message: string; note: Note }>('/api/notes', {
      method: 'POST',
      body: payload,
    })

  updateNote = (id: string, payload: CreateNotePayload) =>
    this.request<{ message: string }>(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    })

  deleteNote = (id: string) =>
    this.request<{ message: string }>(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
}

export const api = new ApiClient()
