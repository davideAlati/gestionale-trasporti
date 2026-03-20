import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function isAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.user_metadata?.role === 'admin'
}

// GET — lista utenti
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map(u => ({
    id:           u.id,
    email:        u.email,
    nome:         u.user_metadata?.nome ?? null,
    cognome:      u.user_metadata?.cognome ?? null,
    role:         u.user_metadata?.role ?? 'staff',
    banned:       !!u.banned_until && new Date(u.banned_until) > new Date(),
    created_at:   u.created_at,
    last_sign_in: u.last_sign_in_at ?? null,
  }))

  return NextResponse.json({ users })
}

// POST — invita nuovo utente
export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { email, nome, cognome } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'staff', nome: nome ?? '', cognome: cognome ?? '' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sent: true })
}
