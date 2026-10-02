import { Suspense } from 'react'
import LoginForm from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#1E40AF] flex items-center justify-center">
            <span className="text-white font-bold text-sm">NX</span>
          </div>
          <span className="font-bold text-[#0F172A] text-lg">Nex - Merecity Brain OS</span>
        </div>

        {/* Card con formulario — Suspense necesario por useSearchParams */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-[#0F172A] mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-[#64748B] mb-6">
            Accede a tu cuenta del equipo
          </p>
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-5">
          Nex - Merecity Brain OS · Sistema interno
        </p>
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-3 w-24 bg-[#E2E8F0] rounded" />
        <div className="h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
        <div className="h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md" />
      </div>
      <div className="h-10 bg-[#DBEAFE] rounded-md mt-2" />
    </div>
  )
}
