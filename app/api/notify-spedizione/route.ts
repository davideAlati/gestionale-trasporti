import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

const STATO_COLORI: Record<string, string> = {
  'Non Assegnato': '#64748b',
  'Pianificato':   '#2563eb',
  'In corso':      '#d97706',
  'Consegnato':    '#16a34a',
  'Problema':      '#dc2626',
}

function fmtData(d: string | null) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

function emailHtml({
  cliente_nome, ref_cliente, origine, destinazione,
  data_partenza, nuovo_stato, targa_camion, targa_semirimorchio,
}: {
  cliente_nome: string
  ref_cliente: string | null
  origine: string | null
  destinazione: string | null
  data_partenza: string | null
  nuovo_stato: string
  targa_camion: string | null
  targa_semirimorchio: string | null
}) {
  const colore = STATO_COLORI[nuovo_stato] ?? '#334155'
  const tratta = origine && destinazione ? `${origine} → ${destinazione}` : origine ?? destinazione ?? '—'

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Verdana,Geneva,Tahoma,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a8a;padding:28px 32px;">
            <p style="margin:0;color:#93c5fd;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Gestionale Trasporti</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:bold;">Aggiornamento Spedizione</h1>
          </td>
        </tr>

        <!-- Saluto -->
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;color:#334155;font-size:14px;">Gentile <strong>${cliente_nome}</strong>,</p>
            <p style="margin:10px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
              La informiamo che lo stato della sua spedizione è stato aggiornato.
            </p>
          </td>
        </tr>

        <!-- Badge stato -->
        <tr>
          <td style="padding:20px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${colore};border-radius:20px;padding:8px 20px;">
                  <span style="color:#ffffff;font-size:13px;font-weight:bold;">${nuovo_stato}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Dettagli spedizione -->
        <tr>
          <td style="padding:0 32px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;">
              ${ref_cliente ? `
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Riferimento</span>
                  <p style="margin:4px 0 0;color:#1e293b;font-size:14px;font-weight:bold;">${ref_cliente}</p>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Tratta</span>
                  <p style="margin:4px 0 0;color:#1e293b;font-size:14px;">${tratta}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;${(targa_camion || targa_semirimorchio) ? 'border-bottom:1px solid #e2e8f0;' : ''}">
                  <span style="color:#94a3b8;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Data partenza</span>
                  <p style="margin:4px 0 0;color:#1e293b;font-size:14px;">${fmtData(data_partenza)}</p>
                </td>
              </tr>
              ${targa_camion || targa_semirimorchio ? `
              <tr>
                <td style="padding:12px 16px;">
                  <span style="color:#94a3b8;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Veicoli</span>
                  <p style="margin:4px 0 0;color:#1e293b;font-size:14px;font-family:monospace;">
                    ${targa_camion ? `<strong>${targa_camion}</strong>` : ''}
                    ${targa_camion && targa_semirimorchio ? ' &nbsp;+&nbsp; ' : ''}
                    ${targa_semirimorchio ? targa_semirimorchio : ''}
                  </p>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
              Questa è una notifica automatica — si prega di non rispondere a questa email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      cliente_email, cliente_nome, ref_cliente,
      origine, destinazione, data_partenza,
      nuovo_stato, targa_camion, targa_semirimorchio,
    } = body

    if (!cliente_email) {
      return NextResponse.json({ skipped: true, reason: 'no email' })
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: cliente_email,
      subject: `Aggiornamento spedizione${ref_cliente ? ` #${ref_cliente}` : ''} — ${nuovo_stato}`,
      html: emailHtml({
        cliente_nome: cliente_nome ?? 'Cliente',
        ref_cliente, origine, destinazione,
        data_partenza, nuovo_stato,
        targa_camion, targa_semirimorchio,
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (e) {
    console.error('notify-spedizione error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
