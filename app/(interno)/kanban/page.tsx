'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Minus, Plus, X, Save } from 'lucide-react'

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
  cliente_id: number | null
  autista_id: number | null
  origine: string | null
  destinazione: string | null
  peso_kg: number | null
  mtl: number | null
  ref_cliente: string | null
  note: string | null
  data_partenza: string | null
  data_arrivo: string | null
  targa_semirimorchio: string | null
  stato: Stato
  clienti: { nome: string | null } | null
  autisti: { nome: string | null; cognome: string | null } | null
}

type Autista = {
  id: number
  nome: string | null
  cognome: string | null
  targa: string | null
}

type Cliente = {
  id: number
  nome: string | null
}

type EditForm = {
  cliente_id: string
  autista_id: string
  origine: string
  destinazione: string
  peso_kg: string
  mtl: string
  ref_cliente: string
  note: string
  data_partenza: string
  data_arrivo: string
  targa_semirimorchio: string
  stato: Stato
}

// ─── Utilità date ─────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

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

// ─── Stato automatico ─────────────────────────────────────────────────────────

function calcolaStato(autistaId: string, statoCorrente: Stato): Stato {
  if (!autistaId) return 'Non Assegnato'
  if (statoCorrente === 'Non Assegnato') return 'Pianificato'
  return statoCorrente
}

// ─── Card compatta ────────────────────────────────────────────────────────────

function KanbanCard({
  spedizione,
  targa,
  onClick,
}: {
  spedizione: SpedizioneRaw
  targa: string | null
  onClick: () => void
}) {
  const cfg = STATO_CONFIG[spedizione.stato]
  const clienteNome = spedizione.clienti?.nome || '—'
  const autistaNome = spedizione.autisti
    ? `${spedizione.autisti.nome ?? ''} ${spedizione.autisti.cognome ?? ''}`.trim()
    : null

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer px-3 py-2.5"
    >
      {/* Stato badge */}
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full mb-1.5 ${cfg.badge}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className={`text-[9px] font-bold uppercase tracking-wide ${cfg.text}`}>{spedizione.stato}</span>
      </div>

      {/* Nome cliente */}
      <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">
        {clienteNome}
      </p>

      {/* Origine → Destinazione */}
      <p className="text-[12px] font-semibold text-slate-600 truncate mt-0.5">
        {spedizione.origine || '—'} → {spedizione.destinazione || '—'}
      </p>

      {/* Targhe sempre visibili + nome autista solo on hover */}
      {autistaNome ? (
        <div className="mt-1.5">
          {/* Targa camion + semirimorchio sulla stessa riga */}
          <div className="flex items-center gap-1.5">
            {targa && (
              <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono">
                {targa}
              </span>
            )}
            {spedizione.targa_semirimorchio && (
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                {spedizione.targa_semirimorchio}
              </span>
            )}
          </div>
          {/* Nome autista visibile solo on hover */}
          <p className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity italic">
            {autistaNome}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 mt-1.5 italic">Autista non assegnato</p>
      )}

      {/* Ref cliente */}
      {spedizione.ref_cliente && (
        <p className="text-[9px] text-slate-400 mt-1">Rif: #{spedizione.ref_cliente}</p>
      )}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-100 px-3 py-2.5 animate-pulse">
      <div className="h-3 bg-slate-100 rounded w-3/4 mb-1.5" />
      <div className="h-3 bg-slate-100 rounded w-full mb-1" />
      <div className="h-2.5 bg-slate-100 rounded w-1/2" />
    </div>
  )
}

// ─── Modal spedizione (modifica + creazione) ──────────────────────────────────

function SpedizioneModal({
  spedizione,
  dataPartenzaDefault,
  clienti,
  autisti,
  onSave,
  onClose,
}: {
  spedizione?: SpedizioneRaw
  dataPartenzaDefault?: string
  clienti: Cliente[]
  autisti: Autista[]
  onSave: (form: EditForm) => Promise<void>
  onClose: () => void
}) {
  const isNew = !spedizione
  const [form, setForm] = useState<EditForm>({
    cliente_id:          String(spedizione?.cliente_id ?? ''),
    autista_id:          String(spedizione?.autista_id ?? ''),
    origine:             spedizione?.origine ?? '',
    destinazione:        spedizione?.destinazione ?? '',
    peso_kg:             spedizione?.peso_kg != null ? String(spedizione.peso_kg) : '',
    mtl:                 spedizione?.mtl != null ? String(spedizione.mtl) : '',
    ref_cliente:         spedizione?.ref_cliente ?? '',
    note:                spedizione?.note ?? '',
    data_partenza:       spedizione?.data_partenza ?? dataPartenzaDefault ?? '',
    data_arrivo:         spedizione?.data_arrivo ?? '',
    targa_semirimorchio: spedizione?.targa_semirimorchio ?? '',
    stato:               spedizione?.stato ?? 'Non Assegnato',
  })
  const [saving, setSaving] = useState(false)

  function handleAutistaChange(autistaId: string) {
    const nuovoStato = calcolaStato(autistaId, form.stato)
    setForm(f => ({ ...f, autista_id: autistaId, stato: nuovoStato }))
  }

  function handleStatoChange(stato: Stato) {
    // Se non c'è autista, stato bloccato su Non Assegnato
    if (!form.autista_id) return
    setForm(f => ({ ...f, stato }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const statoDisabilitato = !form.autista_id

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-800">
            {isNew ? 'Nuova Spedizione' : `Modifica Spedizione #${spedizione!.id}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3.5">

          {/* Cliente */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cliente</label>
            <select
              value={form.cliente_id}
              onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Seleziona cliente —</option>
              {clienti.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Autista */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Autista</label>
            <select
              value={form.autista_id}
              onChange={e => handleAutistaChange(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Nessun autista —</option>
              {autisti.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nome} {a.cognome}{a.targa ? ` — ${a.targa}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Stato */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Stato {statoDisabilitato && <span className="text-slate-400 normal-case font-normal">(assegna un autista per modificare)</span>}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATI.map(s => {
                const c = STATO_CONFIG[s]
                const isActive = s === form.stato
                const disabled = statoDisabilitato && s !== 'Non Assegnato'
                return (
                  <button
                    key={s}
                    onClick={() => handleStatoChange(s)}
                    disabled={disabled}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                      isActive
                        ? `${c.badge} ${c.text} border-current`
                        : disabled
                          ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-slate-200' : c.dot}`} />
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Origine / Destinazione */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Carico</label>
              <input
                type="text"
                value={form.origine}
                onChange={e => setForm(f => ({ ...f, origine: e.target.value }))}
                placeholder="Città di partenza"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Scarico</label>
              <input
                type="text"
                value={form.destinazione}
                onChange={e => setForm(f => ({ ...f, destinazione: e.target.value }))}
                placeholder="Città di arrivo"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Data Carico</label>
              <input
                type="date"
                value={form.data_partenza}
                onChange={e => setForm(f => ({ ...f, data_partenza: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Data Scarico</label>
              <input
                type="date"
                value={form.data_arrivo}
                onChange={e => setForm(f => ({ ...f, data_arrivo: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Peso / MTL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Peso (kg)</label>
              <input
                type="number"
                value={form.peso_kg}
                onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">MTL</label>
              <input
                type="number"
                value={form.mtl}
                onChange={e => setForm(f => ({ ...f, mtl: e.target.value }))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Targa semirimorchio */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Targa Semirimorchio</label>
            <input
              type="text"
              value={form.targa_semirimorchio}
              onChange={e => setForm(f => ({ ...f, targa_semirimorchio: e.target.value.toUpperCase() }))}
              placeholder="Es. AB123CD"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
            />
          </div>

          {/* Ref cliente */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Riferimento Cliente</label>
            <input
              type="text"
              value={form.ref_cliente}
              onChange={e => setForm(f => ({ ...f, ref_cliente: e.target.value }))}
              placeholder="Es. DDT-2026-001"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Note</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Note aggiuntive..."
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvataggio...' : isNew ? 'Crea' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function KanbanPage() {
  const [spedizioni, setSpedizioni] = useState<SpedizioneRaw[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [autisti, setAutisti] = useState<Autista[]>([])
  const [targaByAutista, setTargaByAutista] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [editing, setEditing] = useState<SpedizioneRaw | null>(null)
  const [creating, setCreating] = useState<string | null>(null) // data_partenza precompilata

  const supabase = createClient()

  // Fetch clienti e autisti (una volta sola)
  useEffect(() => {
    async function fetchLookup() {
      const [{ data: cl }, { data: au }, { data: ve }] = await Promise.all([
        supabase.from('clienti').select('id, nome').order('nome'),
        supabase.from('autisti').select('id, nome, cognome').order('cognome'),
        supabase.from('veicoli').select('autista_id, targa').not('autista_id', 'is', null),
      ])
      setClienti((cl ?? []) as Cliente[])

      // Mappa autista_id → targa
      const targaMap: Record<number, string> = {}
      for (const v of (ve ?? [])) {
        if (v.autista_id && v.targa) targaMap[v.autista_id] = v.targa
      }
      setTargaByAutista(targaMap)

      setAutisti(
        ((au ?? []) as { id: number; nome: string | null; cognome: string | null }[]).map(a => ({
          ...a,
          targa: targaMap[a.id] ?? null,
        }))
      )
    }
    fetchLookup()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSpedizioni = useCallback(async () => {
    setLoading(true)
    const days = getWeekDays(weekOffset)
    const mondayStr = toDateStr(days[0])
    const sundayStr = toDateStr(days[6])

    const SELECT = 'id, cliente_id, autista_id, origine, destinazione, peso_kg, mtl, ref_cliente, note, data_partenza, data_arrivo, targa_semirimorchio, stato, clienti(nome), autisti(nome, cognome)'

    const { data: conData } = await supabase
      .from('spedizioni')
      .select(SELECT)
      .gte('data_partenza', mondayStr)
      .lte('data_partenza', sundayStr)

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

  // Realtime: aggiorna automaticamente quando cambiano i dati
  useEffect(() => {
    const channel = supabase
      .channel('spedizioni-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spedizioni' }, () => {
        fetchSpedizioni()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchSpedizioni]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(form: EditForm) {
    await supabase.from('spedizioni').insert({
      cliente_id:          form.cliente_id   ? Number(form.cliente_id)   : null,
      autista_id:          form.autista_id   ? Number(form.autista_id)   : null,
      origine:             form.origine      || null,
      destinazione:        form.destinazione || null,
      peso_kg:             form.peso_kg      ? Number(form.peso_kg)      : null,
      mtl:                 form.mtl          ? Number(form.mtl)          : null,
      ref_cliente:         form.ref_cliente  || null,
      note:                form.note         || null,
      data_partenza:       form.data_partenza || null,
      data_arrivo:         form.data_arrivo  || null,
      targa_semirimorchio: form.targa_semirimorchio || null,
      stato:               form.stato,
    })
    setCreating(null)
    fetchSpedizioni()
  }

  async function handleSave(form: EditForm) {
    await supabase.from('spedizioni').update({
      cliente_id:          form.cliente_id   ? Number(form.cliente_id)   : null,
      autista_id:          form.autista_id   ? Number(form.autista_id)   : null,
      origine:             form.origine      || null,
      destinazione:        form.destinazione || null,
      peso_kg:             form.peso_kg      ? Number(form.peso_kg)      : null,
      mtl:                 form.mtl          ? Number(form.mtl)          : null,
      ref_cliente:         form.ref_cliente  || null,
      note:                form.note         || null,
      data_partenza:       form.data_partenza || null,
      data_arrivo:         form.data_arrivo  || null,
      targa_semirimorchio: form.targa_semirimorchio || null,
      stato:               form.stato,
    }).eq('id', editing!.id)

    setEditing(null)
    fetchSpedizioni()
  }

  const weekDays = getWeekDays(weekOffset)
  const monday   = weekDays[0]
  const sunday   = weekDays[6]
  const weekNum  = getWeekNumber(monday)
  const weekLabel = `${monday.getDate()} ${MESI_IT[monday.getMonth()]} – ${sunday.getDate()} ${MESI_IT[sunday.getMonth()]} ${sunday.getFullYear()}`

  // Raggruppa per giorno
  const byDay: Record<string, SpedizioneRaw[]> = {}
  for (const d of weekDays) byDay[toDateStr(d)] = []
  byDay['senza_data'] = []

  for (const s of spedizioni) {
    if (!s.data_partenza) {
      byDay['senza_data'].push(s)
    } else if (byDay[s.data_partenza] !== undefined) {
      byDay[s.data_partenza].push(s)
    }
  }

  return (
    <div className="relative min-h-screen">

      {/* ── Barra superiore ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col items-center min-w-[220px]">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Settimana {weekNum}</span>
            <span className="text-sm font-semibold text-slate-700">{weekLabel}</span>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronRight size={18} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="ml-1 text-xs text-blue-600 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
              Oggi
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} disabled={zoom <= 50} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors">
            <Minus size={13} />
          </button>
          <span className="text-xs font-mono text-slate-600 min-w-[36px] text-center select-none">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(150, z + 10))} disabled={zoom >= 150} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors">
            <Plus size={13} />
          </button>
          {zoom !== 100 && (
            <button onClick={() => setZoom(100)} className="ml-1 text-[11px] text-blue-600 hover:underline">100%</button>
          )}
        </div>
      </div>

      {/* ── Board ── */}
      <div className="overflow-x-auto pb-4">
        <div style={{ zoom: `${zoom}%` }} className="flex gap-3 min-w-max">

          {weekDays.map(day => {
            const key = toDateStr(day)
            const cards = byDay[key] ?? []
            const oggi = isToday(day)

            return (
              <div key={key} className="w-[230px] shrink-0 flex flex-col">
                <div className={`rounded-xl px-3 py-2 mb-2.5 flex items-center justify-between ${oggi ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <p className={`text-[12px] font-bold ${oggi ? 'text-white' : 'text-slate-700'}`}>
                    {GIORNI_IT[day.getDay()]} {day.getDate()} {MESI_IT[day.getMonth()]}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${oggi ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {cards.length}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setCreating(key) }}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${oggi ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-300 hover:bg-blue-600 hover:text-white text-slate-600'}`}
                      title={`Nuova spedizione ${GIORNI_IT[day.getDay()]} ${day.getDate()}`}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  {loading ? (
                    <><CardSkeleton /><CardSkeleton /></>
                  ) : cards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 px-3 py-6 text-center">
                      <p className="text-xs text-slate-400">Nessuna spedizione</p>
                    </div>
                  ) : cards.map(s => (
                    <KanbanCard
                      key={s.id}
                      spedizione={s}
                      targa={s.autista_id ? (targaByAutista[s.autista_id] ?? null) : null}
                      onClick={() => setEditing(s)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Colonna senza data */}
          {byDay['senza_data'].length > 0 && (
            <div className="w-[230px] shrink-0 flex flex-col">
              <div className="rounded-xl px-3 py-2 mb-2.5 flex items-center justify-between bg-slate-100">
                <p className="text-[12px] font-bold text-slate-500">Non Assegnato — Senza data</p>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  {byDay['senza_data'].length}
                </span>
              </div>
              <div className="space-y-2 flex-1">
                {byDay['senza_data'].map(s => (
                  <KanbanCard
                    key={s.id}
                    spedizione={s}
                    targa={s.autista_id ? (targaByAutista[s.autista_id] ?? null) : null}
                    onClick={() => setEditing(s)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal modifica ── */}
      {editing && (
        <SpedizioneModal
          spedizione={editing}
          clienti={clienti}
          autisti={autisti}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* ── Modal nuova spedizione ── */}
      {creating !== null && (
        <SpedizioneModal
          dataPartenzaDefault={creating}
          clienti={clienti}
          autisti={autisti}
          onSave={handleCreate}
          onClose={() => setCreating(null)}
        />
      )}

      {/* ── Legenda ── */}
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
