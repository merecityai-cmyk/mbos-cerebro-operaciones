'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Correo o contraseña incorrectos.')
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label
          htmlFor="email"
          className="text-xs font-medium text-[#0F172A]"
        >
          Correo electrónico
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@udtgroup.co"
          autoComplete="email"
          className={cn(
            'text-sm h-10',
            errors.email && 'border-[#DC2626] focus-visible:ring-[#DC2626]'
          )}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-[#DC2626]">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className="text-xs font-medium text-[#0F172A]"
        >
          Contraseña
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className={cn(
            'text-sm h-10',
            errors.password &&
              'border-[#DC2626] focus-visible:ring-[#DC2626]'
          )}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-[#DC2626]">
            {errors.password.message}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-[#FEE2E2] border border-[#DC2626]/20 px-3 py-2.5">
          <p className="text-xs text-[#DC2626] font-medium">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-10 bg-[#1E40AF] hover:bg-[#1d3a9e] text-white text-sm font-medium mt-2"
      >
        {isSubmitting ? 'Ingresando...' : 'Ingresar'}
      </Button>
    </form>
  )
}
