import { redirect } from 'next/navigation'
import { auth } from './config'
import type { UserRole } from '@/types'

/**
 * Obtiene la sesión activa. Si no hay sesión, redirige a /login.
 */
export async function requireSession() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

/**
 * Obtiene la sesión y verifica que el usuario tenga el rol requerido.
 * Si no tiene el rol, redirige a /.
 */
export async function requireRole(role: UserRole) {
  const session = await requireSession()
  if (session.user.role !== role) redirect('/')
  return session
}

/**
 * Obtiene la sesión sin redirigir. Retorna null si no hay sesión.
 */
export async function getSession() {
  return auth()
}
