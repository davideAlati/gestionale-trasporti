import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') return null
  return user
}

// PATCH — abilita/disabilita
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  if (id === adminUser.id) return NextResponse.json({ error: 'Non puoi modificare il tuo account' }, { status: 400 })

  const { ban } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: ban ? '876000h' : 'none',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: true })
}

// DELETE — elimina utente
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  if (id === adminUser.id) return NextResponse.json({ error: 'Non puoi eliminare il tuo account' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
