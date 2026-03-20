import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = 'alati@albisped.com'
const FROM_EMAIL  = process.env.RESEND_FROM_EMAIL ?? 'noreply@albisped.app'

// Protegge la route: solo Vercel Cron può chiamarla
function isAuthorized(req: NextRequest) {
  const secret = req.headers.get('authorization')
  return secret === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const priorita = searchParams.get('priorita') as 'alta' | 'media' | 'bassa' | null
  if (!priorita || !['alta', 'media', 'bassa'].includes(priorita)) {
    return NextResponse.json({ error: 'Parametro priorita mancante o non valido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Recupera promemoria non completati con quella priorità, includendo il veicolo
  const { data: items, error } = await admin
    .from('promemoria')
    .select('id, titolo, descrizione, priorita, created_at, veicoli(targa, marca, modello)')
    .eq('priorita', priorita)
    .eq('completato', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!items || items.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'Nessun promemoria aperto' })
  }

  const prioritaLabel = { alta: 'Alta', media: 'Media', bassa: 'Bassa' }[priorita]
  const prioritaColor = { alta: '#ef4444', media: '#f59e0b', bassa: '#22c55e' }[priorita]

  const righe = items.map((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const v = p.veicoli as { targa: string; marca: string | null; modello: string | null } | null
    const veicolo = v ? `${v.targa}${v.marca ? ` — ${v.marca} ${v.modello ?? ''}`.trimEnd() : ''}` : '—'
    return `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #f1f5f9; font-family:monospace; font-size:13px; font-weight:700; color:#1e293b; white-space:nowrap">${veicolo}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #f1f5f9; font-size:13px; font-weight:600; color:#334155">${p.titolo}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #f1f5f9; font-size:12px; color:#94a3b8">${p.descrizione ?? '—'}</td>
      </tr>`
  }).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:600px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden">
      <div style="background:#1e3a5f; padding:24px 28px">
        <p style="margin:0; color:#93c5fd; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px">Albisped — Promemoria Veicoli</p>
        <h1 style="margin:6px 0 0; color:#fff; font-size:20px; font-weight:800">
          Promemoria a Priorità
          <span style="color:${prioritaColor}"> ${prioritaLabel}</span>
        </h1>
      </div>

      <div style="padding:20px 28px">
        <p style="margin:0 0 16px; color:#64748b; font-size:13px">
          Hai <strong style="color:#1e293b">${items.length}</strong> promemori${items.length === 1 ? 'o aperto' : 'a aperti'} con priorità <strong>${prioritaLabel}</strong>.
        </p>

        <table style="width:100%; border-collapse:collapse; background:#f8fafc; border-radius:8px; overflow:hidden">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:10px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b">Veicolo</th>
              <th style="padding:10px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b">Da fare</th>
              <th style="padding:10px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b">Note</th>
            </tr>
          </thead>
          <tbody>${righe}</tbody>
        </table>
      </div>

      <div style="padding:16px 28px; border-top:1px solid #f1f5f9; background:#f8fafc">
        <p style="margin:0; color:#94a3b8; font-size:11px">Notifica automatica — Gestionale Albisped</p>
      </div>
    </div>`

  const { error: mailError } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      ADMIN_EMAIL,
    subject: `[Promemoria ${prioritaLabel}] ${items.length} intervento${items.length === 1 ? '' : 'i'} da eseguire`,
    html,
  })

  if (mailError) return NextResponse.json({ error: mailError.message }, { status: 500 })

  return NextResponse.json({ sent: true, count: items.length, priorita })
}
