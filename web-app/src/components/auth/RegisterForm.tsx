import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { UserPlus } from 'lucide-react'

const schema = z.object({
  username: z
    .string()
    .min(2, '用户名至少 2 个字符')
    .max(32, '用户名最多 32 个字符'),
  password: z
    .string()
    .min(6, '密码至少 6 个字符')
    .max(128, '密码最多 128 个字符'),
})

type FormData = z.infer<typeof schema>

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const registerUser = useAuthStore((s) => s.register)
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
    const ok = await registerUser(data.username.trim(), data.password)
    if (ok) {
      toast('success', '注册成功，请登录')
      onSwitchToLogin()
    } else {
      toast('error', useAuthStore.getState().error || '注册失败')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="用户名"
        placeholder="2-32 个字符"
        error={errors.username?.message}
        {...register('username')}
      />
      <Input
        label="密码"
        type="password"
        placeholder="至少 6 个字符"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" className="w-full" loading={loading}>
        <UserPlus className="w-4 h-4" />
        注册
      </Button>
    </form>
  )
}
