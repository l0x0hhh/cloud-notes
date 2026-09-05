import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { LogIn } from 'lucide-react'

const schema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type FormData = z.infer<typeof schema>

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    const ok = await login(data.username.trim(), data.password)
    if (ok) {
      toast('success', '登录成功')
    } else {
      const msg = useAuthStore.getState().error || '登录失败'
      toast('error', msg)
      setTimeout(() => {
        toast('info', '还没有账号？点击下方「去注册」创建新账号')
      }, 1500)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="用户名"
        placeholder="请输入用户名"
        error={errors.username?.message}
        {...register('username')}
      />
      <Input
        label="密码"
        type="password"
        placeholder="请输入密码"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" className="w-full bg-linear border-0 shadow-soft-sm" loading={loading}>
        <LogIn className="w-4 h-4" />
        登录
      </Button>
    </form>
  )
}
