import { NextRequest, NextResponse } from 'next/server'
import { requireRouteUser } from '@/lib/supabase-route'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRouteUser(req)

    const { error: deleteError, count } = await supabase
      .from('ventas')
      .delete({ count: 'exact' })
      .eq('empresa', user.email)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return NextResponse.json({ deleted: count ?? 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible eliminar las ventas.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
