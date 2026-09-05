import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { useTheme } from '@/hooks/useTheme'
import { FileText, Sun, Moon } from 'lucide-react'

export function AuthPage() {
  const [showLogin, setShowLogin] = useState(true)
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card-glass/60 backdrop-blur-sm transition-colors z-10"
        title={theme === 'light' ? '切换暗色模式' : '切换亮色模式'}
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Brand */}
      <div className="flex items-center gap-3 mb-8 z-10">
        <div className="p-2.5 rounded-xl bg-brand/15 text-brand">
          <FileText className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-linear tracking-tight font-display">
          Cloud Notes
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-md card card-lg overflow-hidden animate-scale-in z-10 p-0">
        <div className="h-1 bg-linear" />

        <div className="p-8">
          {showLogin ? (
            <>
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-foreground tracking-tight font-display">欢迎回来</h2>
                <p className="text-sm text-muted-foreground mt-1">登录你的账号继续使用</p>
              </div>
              <LoginForm onSwitchToRegister={() => setShowLogin(false)} />
              <p className="text-sm text-muted-foreground text-center mt-6">
                还没有账号？{' '}
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-brand hover:underline font-medium transition-colors"
                >
                  去注册
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-foreground tracking-tight font-display">创建账号</h2>
                <p className="text-sm text-muted-foreground mt-1">注册一个新账号开始使用</p>
              </div>
              <RegisterForm onSwitchToLogin={() => setShowLogin(true)} />
              <p className="text-sm text-muted-foreground text-center mt-6">
                已有账号？{' '}
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-brand hover:underline font-medium transition-colors"
                >
                  去登录
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted text-center mt-6 z-10">
        登录即表示你同意服务条款。数据通过 JWT 认证保护。
      </p>
    </div>
  )
}
