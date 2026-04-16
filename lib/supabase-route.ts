import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Sesión no válida. Inicia sesión de nuevo.')
  }

  return authHeader.slice('Bearer '.length)
}

export function createRouteSupabase(req: NextRequest) {
  const token = getBearerToken(req)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  return { supabase, token }
}

export async function requireRouteUser(req: NextRequest) {
  const { supabase, token } = createRouteSupabase(req)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user?.email) {
    throw new Error('No fue posible validar la sesión del usuario.')
  }

  return {
    supabase,
    user: data.user,
  }
}
