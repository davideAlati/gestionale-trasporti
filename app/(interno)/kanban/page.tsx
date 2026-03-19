'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Minus, Plus, Check, ArrowRight } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Stato = 'Non Assegnato' | 'Pianificato' | 'In corso' | 'Consegnato' | 'Problema'

const STATI: Stato[] = ['Non Assegnato', 'Pianificato', 'In corso', 'Consegnato', 'Problema']

const STATO_CONFIG: Record<Stato, { dot: string; badge: string; text: string }> = {
  'Non Assegnato': { dot: 'bg-slate-400',  badge: 'bg-slate-100',  text: 'text-slate-600' },
  'Pianificato':   { dot: 'bg-blue-500',   badge: 'bg-blue-50',    text: 'text-blue-700'  },
  'In corso':      { dot: 'bg-amber-500',  badge: 'bg-amber-50',   text: 'text-amber-700' },
  'Consegnato':    { dot: 'bg-green-500',  badge: 'bg-green-50',   text: 'text-green-700' },
  'Problema':      { dot: 'bg-red-500',    badge: 'bg-red-50',     text: 'text-red-700'   },
}

const GIORNI_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const MESI_IT   = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

type SpedizioneRaw = {
  id: number
  origine: string | null
  destinazione: string | null
  peso_kg: number | null
  mtl: number | null
  ref_cliente: string | null
  data_partenza: string | null
  data_arrivo: string | null
  stato: Stato
  clienti: { nome: string | null } | null
  autisti: { nome: string | null; cognome: string | null } | null
}

// ─── Utilità settimana ────────────────────────────────────────────────────────

function getWeekDays(offset: number): Date[] {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function isToday(d: Date) {
  const now = new Date()
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function KanbanCard({
  spedizione,
  onChangeStatus,
}: {
  spedizione: SpedizioneRaw
  onChangeStatus: () => void
}) {
  const cfg = STATO_CONFIG[spedizione.stato]
  const clienteNome = spedizione.clienti?.nome || 'Cliente sconosciuto'
  const autistaNome = spedizione.autisti
    ? `${spedizione.autisti.nome ?? ''} ${spedizione.autisti.cognome ?? ''}`.trim()
    : 'Non assegnato'

  return (
    <div
      onClick={onChangeStatus}
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group p-3"
    >
      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full mb-2 ${cfg.badge}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className={`text-[10px] font-semibold ${cfg.text}`}>{spedizione.stato}</span>
      </div>

      {/* Nome cliente – grande */}
      <p className="text-[15px] font-bold text-slate-800 leading-snug mb-1.5">
        {clienteNome}
      </p>

      {/* Origine → Destinazione – grande */}
      <div className="flex items-center gap-1 mb-2.5">
        <span className="text-[13px] font-semibold text-slate-700 truncate">
          {spedizione.origine || '—'}
        </span>
        <ArrowRight size={11} className="text-slate-400 shrink-0" />
        <span className="text-[13px] font-semibold text-slate-700 truncate">
          {spedizione.destinazione || '—'}
        </span>
      </div>

      {/* Autista + Rif */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 truncate">{autistaNome}</span>
        {spedizione.ref_cliente && (
          <span className="text-[9px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-400 shrink-0">
            #{spedizione.ref_cliente}
          </span>
        )}
      </div>

      {/* Peso / MTL */}
      {(spedizione.peso_kg != null || spedizione.mtl != null) && (
        <div className="flex gap-3 text-[11px] text-slate-400 mt-2">
          {spedizione.peso_kg != null && <span>{spedizione.peso_kg} kg</span>}
          {spedizione.mtl != null && <span>{spedizione.mtl} mtl</span>}
        </div>
      )}

      {/* Data arrivo */}
      {spedizione.data_arrivo && (
        <div className="mt-1.5 text-[11px] text-slate-400">
          Arrivo: {new Date(spedizione.data_arrivo).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {/* Hint hover */}
      <div className="mt-2 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-blue-600 font-semibold">Cambia stato →</p>
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-full mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const [spedizioni, setSpedizioni] = useState<SpedizioneRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [changingStatus, setChangingStatus] = useState<{ id: number; current: Stato } | null>(null)

  const supabase = createClient()
  const weekDays = getWeekDays(weekOffset)
  const monday = weekDays[0]
  const sunday = weekDays[6]
  const weekNum = getWeekNumber(monday)

  const fetchSpedizioni = useCallback(async () => {
    setLoading(true)
    const days = getWeekDays(weekOffset)
    const mondayStr = toDateStr(days[0])
    const sundayStr = toDateStr(days[6])

    const SELECT = 'id, origine, destinazione, peso_kg, mtl, ref_cliente, data_partenza, data_arrivo, stato, clienti(nome), autisti(nome, cognome)'

    // Spedizioni della settimana (con data_partenza)
    const { data: conData } = await supabase
      .from('spedizioni')
      .select(SELECT)
      .gte('data_partenza', mondayStr)
      .lte('data_partenza', sundayStr)

    // Non Assegnato senza data (sempre visibili nella colonna "Senza data")
    const { data: senzaData } = await supabase
      .from('spedizioni')
      .select(SELECT)
      .eq('stato', 'Non Assegnato')
      .is('data_partenza', null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSpedizioni([...(conData ?? []), ...(senzaData ?? [])] as unknown as SpedizioneRaw[])
    setLoading(false)
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSpedizioni() }, [fetchSpedizioni])

  async function changeStatus(id: number, newStato: Stato) {
    await supabase.from('spedizioni').update({ stato: newStato }).eq('id', id)
    setChangingStatus(null)
    fetchSpedizioni()
  }

  // Raggruppa per giorno (YYYY-MM-DD) + bucket "senza_data" per Non Assegnato senza data
  const byDay: Record<string, SpedizioneRaw[]> = {}
  for (const d of weekDays) byDay[toDateStr(d)] = []
  byDay['senza_data'] = []

  for (const s of spedizioni) {
    if (!s.data_partenza) {
      byDay['senza_data'].push(s)
    } else {
      const key = s.data_partenza
      if (byDay[key]) byDay[key].push(s)
    }
  }

  const weekRangeLabel = `${monday.getDate()} ${MESI_IT[monday.getMonth()]} – ${sunday.getDate()} ${MESI_IT[sunday.getMonth()]} ${sunday.getFullYear()}`

  return (
    <div className="relative min-h-screen">
      {/* ── Barra superiore ── */}
      <div className="flex items-center justify-between mb-5">

        {/* Navigazione settimana */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col items-center min-w-[220px]">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
              Settimana {weekNum}
            </span>
            <span className="text-sm font-semibold text-slate-700">{weekRangeLabel}</span>
          </div>

          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-1 text-xs text-blue-600 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Oggi
            </button>
          )}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
          <button
            onClick={() => setZoom(z => Math.max(50, z - 10))}
            disabled={zoom <= 50}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors"
          >
            <Minus size={13} />
          </button>
          <span className="text-xs font-mono text-slate-600 min-w-[36px] text-center select-none">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(150, z + 10))}
            disabled={zoom >= 150}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors"
          >
            <Plus size={13} />
          </button>
          {zoom !== 100 && (
            <button onClick={() => setZoom(100)} className="ml-1 text-[11px] text-blue-600 hover:underline">
              100%
            </button>
          )}
        </div>
      </div>

      {/* ── Board ── */}
      <div className="overflow-x-auto pb-4">
        <div style={{ zoom: `${zoom}%` }} className="flex gap-3 min-w-max">

          {/* 7 colonne giorno */}
          {weekDays.map(day => {
            const key = toDateStr(day)
            const cards = byDay[key] ?? []
            const oggi = isToday(day)

            return (
              <div key={key} className="w-[240px] shrink-0 flex flex-col">
                {/* Header giorno */}
                <div className={`rounded-xl px-3 py-2.5 mb-3 flex items-end justify-between ${
                  oggi
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${oggi ? 'text-blue-200' : 'text-slate-500'}`}>
                      {GIORNI_IT[day.getDay()]}
                    </p>
                    <p className={`text-3xl font-bold leading-none mt-0.5 ${oggi ? 'text-white' : 'text-slate-800'}`}>
                      {day.getDate()}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${oggi ? 'text-blue-200' : 'text-slate-500'}`}>
                      {MESI_IT[day.getMonth()]}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    oggi ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 flex-1">
                  {loading ? (
                    <>
                      <CardSkeleton />
                      <CardSkeleton />
                    </>
                  ) : cards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 px-3 py-8 text-center">
                      <p className="text-xs text-slate-400">Nessuna spedizione</p>
                    </div>
                  ) : (
                    cards.map(s => (
                      <KanbanCard
                        key={s.id}
                        spedizione={s}
                        onChangeStatus={() => setChangingStatus({ id: s.id, current: s.stato })}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {/* Colonna "Senza data" per Non Assegnato */}
          {byDay['senza_data'].length > 0 && (
            <div className="w-[240px] shrink-0 flex flex-col">
              <div className="rounded-xl px-3 py-2.5 mb-3 flex items-end justify-between bg-slate-100 text-slate-700">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Non assegnato
                  </p>
                  <p className="text-3xl font-bold leading-none mt-0.5 text-slate-400">—</p>
                  <p className="text-[11px] mt-0.5 text-slate-500">Senza data</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  {byDay['senza_data'].length}
                </span>
              </div>
              <div className="space-y-2.5 flex-1">
                {byDay['senza_data'].map(s => (
                  <KanbanCard
                    key={s.id}
                    spedizione={s}
                    onChangeStatus={() => setChangingStatus({ id: s.id, current: s.stato })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal cambio stato ── */}
      {changingStatus && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setChangingStatus(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[300px]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Cambia stato spedizione</h3>
            <div className="space-y-1.5">
              {STATI.map(s => {
                const c = STATO_CONFIG[s]
                const isActive = s === changingStatus.current
                return (
                  <button
                    key={s}
                    onClick={() => changeStatus(changingStatus.id, s)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      isActive ? `${c.badge} ring-2 ring-inset ring-current` : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot} shrink-0`} />
                    <span className={`text-sm font-semibold ${isActive ? c.text : 'text-slate-700'}`}>{s}</span>
                    {isActive && <Check size={14} className="ml-auto text-slate-500" />}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setChangingStatus(null)}
              className="mt-4 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ── Legenda fissa basso sinistra ── */}
      <div className="fixed bottom-6 left-20 bg-white rounded-xl border border-slate-200 shadow-md px-4 py-3 z-40">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legenda</p>
        <div className="space-y-1.5">
          {STATI.map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${STATO_CONFIG[s].dot} shrink-0`} />
              <span className="text-[11px] text-slate-600">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
