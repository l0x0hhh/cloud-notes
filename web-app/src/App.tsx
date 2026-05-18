import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { AuthPage } from '@/pages/AuthPage'
import { WorkspacePage } from '@/pages/WorkspacePage'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/hooks/useTheme'

export default function App() {
  const token = useAuthStore((s) => s.token)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    if (token) {
      checkAuth()
    }
  }, [token, checkAuth])

  return (
    <ThemeProvider>
      <ToastProvider>
        {token ? <WorkspacePage /> : <AuthPage />}
      </ToastProvider>
    </ThemeProvider>
  )
}
