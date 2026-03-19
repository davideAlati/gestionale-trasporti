'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Minus, Plus, Check, ArrowRight } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Stato = 'Non Assegnato' | 'Pianificato' | 'In corso' | 'Consegnato' | 'Problema'

const STATI: Stato[] = ['Non Assegnato', 'Pianificato', 'In corso', 'Consegnato', 'Problema']

const STATO_CONFIG: Record<Stato, {
  header: string
  cardBorder: string
  badge: string
  dot: string
  count: string
}> = {
  'Non Assegnato': {
    header: 'bg-slate-100 text-slate-700',
    cardBorder: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
    count: 'bg-slate-300 text-slate-700',
  },
  'Pianificato': {
    header: 'bg-blue-50 text-blue-800',
    cardBorder: 'border-blue-100',
    badge: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
    count: 'bg-blue-200 text-blue-800',
  },
  'In corso': {
    header: 'bg-amber-50 text-amber-800',
    cardBorder: 'border-amber-200',
    badge: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    count: 'bg-amber-200 text-amber-800',
  },
  'Consegnato': {
    header: 'bg-green-50 text-green-800',
    cardBorder: 'border-green-200',
    badge: 'bg-green-50 text-green-700',
    dot: 'bg-green-500',
    count: 'bg-green-200 text-green-800',
  },
  'Problema': {
    header: 'bg-red-50 text-red-800',
    cardBorder: 'border-red-200',
    badge: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
    count: 'bg-red-200 text-red-800',
  },
}

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

function getWeekRange(offset: number) {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatWeekLabel(monday: Date, sunday: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const m = monday.toLocaleDateString('it-IT', opts)
  const s = sunday.toLocaleDateString('it-IT', opts)
  const year = monday.getFullYear()
  const wn = getWeekNumber(monday)
  return { label: `${m} – ${s} ${year}`, week: `Sett. ${wn}` }
}

// ─── Componente Card ──────────────────────────────────────────────────────────

function KanbanCard({
  spedizione,
  cfg,
  onChangeStatus,
}: {
  spedizione: SpedizioneRaw
  cfg: typeof STATO_CONFIG['Non Assegnato']
  onChangeStatus: () => void
}) {
  const clienteNome = spedizione.clienti?.nome || 'Cliente sconosciuto'
  const autistaNome = spedizione.autisti
    ? `${spedizione.autisti.nome ?? ''} ${spedizione.autisti.cognome ?? ''}`.trim()
    : 'Non assegnato'

  return (
    <div
      onClick={onChangeStatus}
      className={`bg-white rounded-xl border ${cfg.cardBorder} shadow-sm hover:shadow-md transition-all cursor-pointer group p-3.5`}
    >
      {/* Nome cliente – grande */}
      <p className="text-[17px] font-bold text-slate-800 leading-snug mb-2">
        {clienteNome}
      </p>

      {/* Origine → Destinazione – grande */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[15px] font-semibold text-slate-700 truncate">
          {spedizione.origine || '—'}
        </span>
        <ArrowRight size={13} className="text-slate-400 shrink-0" />
        <span className="text-[15px] font-semibold text-slate-700 truncate">
          {spedizione.destinazione || '—'}
        </span>
      </div>

      {/* Autista + Rif */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-slate-500 truncate">{autistaNome}</span>
        {spedizione.ref_cliente && (
          <span className="text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-400 shrink-0">
            #{spedizione.ref_cliente}
          </span>
        )}
      </div>

      {/* Date */}
      {(spedizione.data_partenza || spedizione.data_arrivo) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-50">
          {spedizione.data_partenza && (
            <span>
              {new Date(spedizione.data_partenza).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )}
          {spedizione.data_partenza && spedizione.data_arrivo && <span>→</span>}
          {spedizione.data_arrivo && (
            <span>
              {new Date(spedizione.data_arrivo).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )}
        </div>
      )}

      {/* Peso / MTL */}
      {(spedizione.peso_kg || spedizione.mtl) && (
        <div className="flex gap-3 text-xs text-slate-400 mt-1.5">
          {spedizione.peso_kg != null && <span>{spedizione.peso_kg} kg</span>}
          {spedizione.mtl != null && <span>{spedizione.mtl} mtl</span>}
        </div>
      )}

      {/* Hint hover */}
      <div className="mt-2.5 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[11px] text-blue-600 font-medium">Clicca per cambiare stato →</p>
      </div>
    </div>
  )
}

// ─── Scheletro loading ────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3.5 animate-pulse">
      <div className="h-5 bg-slate-100 rounded-md w-3/4 mb-2.5" />
      <div className="h-4 bg-slate-100 rounded-md w-full mb-3" />
      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function KanbanPage() {
  const [spedizioni, setSpedizioni] = useState<SpedizioneRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [changingStatus, setChangingStatus] = useState<{ id: number; current: Stato } | null>(null)

  const supabase = createClient()

  const fetchSpedizioni = useCallback(async () => {
    setLoading(true)

    const { monday, sunday } = getWeekRange(weekOffset)
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]

    const SELECT = 'id, origine, destinazione, peso_kg, mtl, ref_cliente, data_partenza, data_arrivo, stato, clienti(nome), autisti(nome, cognome)'

    // Non Assegnato: tutti (non hanno ancora data)
    const { data: nonAssegnate } = await supabase
      .from('spedizioni')
      .select(SELECT)
      .eq('stato', 'Non Assegnato')

    // Altri stati: filtro per settimana
    const { data: altriStati } = await supabase
      .from('spedizioni')
      .select(SELECT)
      .neq('stato', 'Non Assegnato')
      .gte('data_partenza', mondayStr)
      .lte('data_partenza', sundayStr)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSpedizioni([...(nonAssegnate ?? []), ...(altriStati ?? [])] as unknown as SpedizioneRaw[])
    setLoading(false)
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSpedizioni()
  }, [fetchSpedizioni])

  async function changeStatus(id: number, newStato: Stato) {
    await supabase.from('spedizioni').update({ stato: newStato }).eq('id', id)
    setChangingStatus(null)
    fetchSpedizioni()
  }

  const grouped = STATI.reduce((acc, stato) => {
    acc[stato] = spedizioni.filter(s => s.stato === stato)
    return acc
  }, {} as Record<Stato, SpedizioneRaw[]>)

  const { monday, sunday } = getWeekRange(weekOffset)
  const { label: weekLabel, week: weekNum } = formatWeekLabel(monday, sunday)

  return (
    <div className="relative min-h-screen">
      {/* ── Barra superiore ── */}
      <div className="flex items-center justify-between mb-5">
        {/* Navigazione settimana */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
            title="Settimana precedente"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col items-center min-w-[200px]">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              {weekNum}
            </span>
            <span className="text-sm font-medium text-slate-700">{weekLabel}</span>
          </div>

          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
            title="Settimana successiva"
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

        {/* Controllo zoom */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
          <button
            onClick={() => setZoom(z => Math.max(50, z - 10))}
            disabled={zoom <= 50}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors"
            title="Riduci zoom"
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
            title="Aumenta zoom"
          >
            <Plus size={13} />
          </button>
          {zoom !== 100 && (
            <button
              onClick={() => setZoom(100)}
              className="ml-1 text-[11px] text-blue-600 hover:underline"
            >
              100%
            </button>
          )}
        </div>
      </div>

      {/* ── Board Kanban ── */}
      <div className="overflow-x-auto pb-4">
        <div
          style={{ zoom: `${zoom}%` }}
          className="flex gap-4 min-w-max"
        >
          {STATI.map(stato => {
            const cfg = STATO_CONFIG[stato]
            const cards = grouped[stato] ?? []

            return (
              <div key={stato} className="w-[260px] shrink-0 flex flex-col">
                {/* Header colonna */}
                <div className={`rounded-xl px-3 py-2.5 flex items-center justify-between mb-3 ${cfg.header}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-semibold">{stato}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.count}`}>
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
                        cfg={cfg}
                        onChangeStatus={() => setChangingStatus({ id: s.id, current: s.stato })}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal cambio stato ── */}
      {changingStatus && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setChangingStatus(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[320px]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-slate-800 mb-4">
              Cambia stato spedizione
            </h3>

            <div className="space-y-1.5">
              {STATI.map(s => {
                const c = STATO_CONFIG[s]
                const isActive = s === changingStatus.current
                return (
                  <button
                    key={s}
                    onClick={() => changeStatus(changingStatus.id, s)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      isActive
                        ? `${c.badge} ring-2 ring-inset ring-current`
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot} shrink-0`} />
                    <span className="text-sm text-slate-700 font-medium">{s}</span>
                    {isActive && <Check size={14} className="ml-auto text-slate-600" />}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setChangingStatus(null)}
              className="mt-4 w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ── Legenda (basso sinistra) ── */}
      <div className="fixed bottom-6 left-20 bg-white rounded-xl border border-slate-200 shadow-md px-4 py-3 z-40">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Legenda
        </p>
        <div className="space-y-1.5">
          {STATI.map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${STATO_CONFIG[s].dot} shrink-0`} />
              <span className="text-xs text-slate-600">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
