export interface Note {
  ID: number
  Title: string
  Content: string
  CreatedAt?: string
}

export interface User {
  user_id: number
}

export interface AuthResponse {
  token: string
}

export interface ApiError {
  error: string
}

export interface CreateNotePayload {
  title: string
  content: string
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
