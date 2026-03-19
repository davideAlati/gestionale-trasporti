'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, AlertCircle, Wrench, CalendarClock } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Spedizione = {
  id: number
  stato: string | null
  data_partenza: string | null
  clienti: { nome: string } | null
  origine: string | null
  destinazione: string | null
}

type Manutenzione = {
  id: number
  data_intervento: string
  tipologia_intervento: string | null
  targa: string
  fornitore: string | null
  costo: number | null
}

// ─── Utilità ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

function fmtData(d: string) {
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

function fmtCosto(c: number | null) {
  if (c == null) return ''
  return c.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

// ─── Configurazione stati spedizione ─────────────────────────────────────────

const STATO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Non Assegnato': { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
  'Pianificato':   { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'In Transito':   { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  'Consegnato':    { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500'  },
  'Annullato':     { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'    },
}

// ─── Componenti card ──────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient()

  const [spedizioniSettimana, setSpedizioniSettimana] = useState<Spedizione[]>([])
  const [nonAssegnatiOggi, setNonAssegnatiOggi] = useState(0)
  const [manutenzioni, setManutenzioni] = useState<Manutenzione[]>([])
  const [prossimiCarichi, setProssimiCarichi] = useState<Spedizione[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const oggi = new Date()
      const oggiStr = toDateStr(oggi)

      // Lunedì della settimana corrente
      const lunedi = new Date(oggi)
      lunedi.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7))
      const lunediStr = toDateStr(lunedi)

      // Domenica della settimana corrente
      const domenica = new Date(lunedi)
      domenica.setDate(lunedi.getDate() + 6)
      const domenicaStr = toDateStr(domenica)

      // Dopodomani
      const dopodomani = new Date(oggi)
      dopodomani.setDate(oggi.getDate() + 2)
      const dopodomaniStr = toDateStr(dopodomani)

      const [resSettimana, resManutenzioni, resProssimiCarichi, resNonAssegnati] = await Promise.all([
        // Spedizioni della settimana
        supabase
          .from('spedizioni')
          .select('id, stato, data_partenza, origine, destinazione, clienti(nome)')
          .gte('data_partenza', lunediStr)
          .lte('data_partenza', domenicaStr)
          .order('data_partenza'),

        // Ultime 5 manutenzioni
        supabase
          .from('manutenzioni')
          .select('id, data_intervento, tipologia_intervento, targa, fornitore, costo')
          .order('data_intervento', { ascending: false })
          .limit(5),

        // Prossimi carichi (oggi + dopodomani)
        supabase
          .from('spedizioni')
          .select('id, stato, data_partenza, origine, destinazione, clienti(nome)')
          .gte('data_partenza', oggiStr)
          .lte('data_partenza', dopodomaniStr)
          .order('data_partenza'),

        // Non assegnate oggi (query dedicata)
        supabase
          .from('spedizioni')
          .select('id', { count: 'exact', head: true })
          .eq('stato', 'Non Assegnato')
          .eq('data_partenza', oggiStr),
      ])

      const settimana = (resSettimana.data ?? []) as unknown as Spedizione[]
      setSpedizioniSettimana(settimana)
      setNonAssegnatiOggi(resNonAssegnati.count ?? 0)
      setManutenzioni((resManutenzioni.data ?? []) as Manutenzione[])
      setProssimiCarichi((resProssimiCarichi.data ?? []) as unknown as Spedizione[])
      setLoading(false)
    }

    fetchAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Breakdown stati settimana
  const statiSettimana = spedizioniSettimana.reduce<Record<string, number>>((acc, s) => {
    const stato = s.stato ?? 'Sconosciuto'
    acc[stato] = (acc[stato] ?? 0) + 1
    return acc
  }, {})

  const oggi = new Date()
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
  const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

  return (
    <div className="space-y-6">

      {/* Intestazione */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {giorni[oggi.getDay()]}, {oggi.getDate()} {mesi[oggi.getMonth()]} {oggi.getFullYear()}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          icon={<Package size={20} className="text-blue-600" />}
          label="Spedizioni questa settimana"
          value={loading ? '—' : spedizioniSettimana.length}
          sub={`${Object.entries(statiSettimana).map(([s, n]) => `${n} ${s}`).join(' · ')}`}
          color="bg-blue-50"
        />
        <KpiCard
          icon={<AlertCircle size={20} className="text-red-500" />}
          label="Non assegnate oggi"
          value={loading ? '—' : nonAssegnatiOggi}
          sub="Spedizioni odierne senza autista"
          color="bg-red-50"
        />
      </div>

      {/* Griglia inferiore */}
      <div className="grid grid-cols-2 gap-4">

        {/* Prossimi carichi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <CalendarClock size={15} className="text-blue-600" />
            <h2 className="text-[13px] font-bold text-slate-700">Prossimi carichi (48h)</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex gap-3">
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                </div>
              ))
            ) : prossimiCarichi.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-xs">Nessun carico nei prossimi 2 giorni</div>
            ) : prossimiCarichi.map(s => {
              const stato = s.stato ?? ''
              const c = STATO_COLORS[stato] ?? STATO_COLORS['Non Assegnato']
              return (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {(s.clienti as any)?.nome ?? '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{s.origine && s.destinazione ? `${s.origine} → ${s.destinazione}` : '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-400">{fmtData(s.data_partenza!)}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {stato}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ultime manutenzioni */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <Wrench size={15} className="text-amber-600" />
            <h2 className="text-[13px] font-bold text-slate-700">Ultime 5 manutenzioni</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex gap-3">
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                </div>
              ))
            ) : manutenzioni.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-xs">Nessuna manutenzione registrata</div>
            ) : manutenzioni.map(m => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                      {m.targa}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {m.tipologia_intervento ?? '—'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{m.fornitore ?? '—'}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[11px] text-slate-400">{fmtData(m.data_intervento)}</p>
                  {m.costo != null && <p className="text-xs font-semibold text-slate-600">{fmtCosto(m.costo)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Spedizioni settimana — breakdown */}
      {!loading && spedizioniSettimana.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <Package size={15} className="text-blue-600" />
            <h2 className="text-[13px] font-bold text-slate-700">Spedizioni settimana corrente</h2>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-3">
            {Object.entries(statiSettimana).map(([stato, count]) => {
              const c = STATO_COLORS[stato] ?? STATO_COLORS['Non Assegnato']
              return (
                <div key={stato} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${c.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`text-xs font-bold ${c.text}`}>{count} {stato}</span>
                </div>
              )
            })}
          </div>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {spedizioniSettimana.map(s => {
              const stato = s.stato ?? ''
              const c = STATO_COLORS[stato] ?? STATO_COLORS['Non Assegnato']
              return (
                <div key={s.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 flex-shrink-0 w-16">{fmtData(s.data_partenza!)}</span>
                    <p className="text-xs font-semibold text-slate-800 truncate">{(s.clienti as any)?.nome ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{s.origine && s.destinazione ? `${s.origine} → ${s.destinazione}` : '—'}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${c.bg} ${c.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {stato}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
