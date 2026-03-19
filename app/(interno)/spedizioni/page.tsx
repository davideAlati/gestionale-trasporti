'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, Save, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

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

type Spedizione = {
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

type Autista = { id: number; nome: string | null; cognome: string | null; targa: string | null }
type Cliente = { id: number; nome: string | null }

type Form = {
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

const EMPTY_FORM: Form = {
  cliente_id: '', autista_id: '', origine: '', destinazione: '',
  peso_kg: '', mtl: '', ref_cliente: '', note: '',
  data_partenza: '', data_arrivo: '', targa_semirimorchio: '',
  stato: 'Non Assegnato',
}

const PAGE_SIZE = 20

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })
}

function calcolaStato(autistaId: string, statoCorrente: Stato): Stato {
  if (!autistaId) return 'Non Assegnato'
  if (statoCorrente === 'Non Assegnato') return 'Pianificato'
  return statoCorrente
}

// ─── Badge stato ─────────────────────────────────────────────────────────────

function StatoBadge({ stato }: { stato: Stato }) {
  const c = STATO_CONFIG[stato]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.badge} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {stato}
    </span>
  )
}

// ─── Modal spedizione ─────────────────────────────────────────────────────────

function SpedizioneModal({
  spedizione, dataPartenzaDefault, clienti, autisti, targaByAutista,
  onSave, onDelete, onClose,
}: {
  spedizione?: Spedizione
  dataPartenzaDefault?: string
  clienti: Cliente[]
  autisti: Autista[]
  targaByAutista: Record<number, string>
  onSave: (form: Form) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const isNew = !spedizione
  const [form, setForm] = useState<Form>({
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
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleAutistaChange(id: string) {
    setForm(f => ({ ...f, autista_id: id, stato: calcolaStato(id, f.stato) }))
  }

  function handleStatoChange(stato: Stato) {
    if (!form.autista_id) return
    setForm(f => ({ ...f, stato }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

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

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cliente</label>
            <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} className={input}>
              <option value="">— Seleziona cliente —</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Autista</label>
            <select value={form.autista_id} onChange={e => handleAutistaChange(e.target.value)} className={input}>
              <option value="">— Nessun autista —</option>
              {autisti.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nome} {a.cognome}{a.targa ? ` — ${a.targa}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Stato {!form.autista_id && <span className="text-slate-400 normal-case font-normal">(assegna un autista per modificare)</span>}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATI.map(s => {
                const c = STATO_CONFIG[s]
                const isActive = s === form.stato
                const disabled = !form.autista_id && s !== 'Non Assegnato'
                return (
                  <button key={s} onClick={() => handleStatoChange(s)} disabled={disabled}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                      isActive ? `${c.badge} ${c.text} border-current`
                        : disabled ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-slate-200' : c.dot}`} />
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Carico</label>
              <input type="text" value={form.origine} onChange={e => setForm(f => ({ ...f, origine: e.target.value }))} placeholder="Città di partenza" className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Scarico</label>
              <input type="text" value={form.destinazione} onChange={e => setForm(f => ({ ...f, destinazione: e.target.value }))} placeholder="Città di arrivo" className={input} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Data Carico</label>
              <input type="date" value={form.data_partenza} onChange={e => setForm(f => ({ ...f, data_partenza: e.target.value }))} className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Data Scarico</label>
              <input type="date" value={form.data_arrivo} onChange={e => setForm(f => ({ ...f, data_arrivo: e.target.value }))} className={input} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Peso (kg)</label>
              <input type="number" value={form.peso_kg} onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))} placeholder="0" className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">MTL</label>
              <input type="number" value={form.mtl} onChange={e => setForm(f => ({ ...f, mtl: e.target.value }))} placeholder="0" className={input} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Targa Semirimorchio</label>
            <input type="text" value={form.targa_semirimorchio}
              onChange={e => setForm(f => ({ ...f, targa_semirimorchio: e.target.value.toUpperCase() }))}
              placeholder="Es. AB123CD" className={`${input} font-mono uppercase`} />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Riferimento Cliente</label>
            <input type="text" value={form.ref_cliente} onChange={e => setForm(f => ({ ...f, ref_cliente: e.target.value }))} placeholder="Es. DDT-2026-001" className={input} />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Note aggiuntive..." rows={2} className={`${input} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            {!isNew && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-red-600 font-semibold">Confermi eliminazione?</span>
                  <button onClick={onDelete} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                    Sì, elimina
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs transition-colors">
                    Annulla
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors">
                  <Trash2 size={13} /> Elimina
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Annulla</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              <Save size={14} />
              {saving ? 'Salvataggio...' : isNew ? 'Crea' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function SpedizioniPage() {
  const [spedizioni, setSpedizioni] = useState<Spedizione[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Lookup
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [autisti, setAutisti] = useState<Autista[]>([])
  const [targaByAutista, setTargaByAutista] = useState<Record<number, string>>({})

  // Filtri
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState<Stato | ''>('')
  const [filtroDateFrom, setFiltroDateFrom] = useState('')
  const [filtroDateTo, setFiltroDateTo] = useState('')

  // Modal
  const [editing, setEditing] = useState<Spedizione | null>(null)
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  // Fetch lookup
  useEffect(() => {
    async function fetchLookup() {
      const [{ data: cl }, { data: au }, { data: ve }] = await Promise.all([
        supabase.from('clienti').select('id, nome').order('nome'),
        supabase.from('autisti').select('id, nome, cognome').order('cognome'),
        supabase.from('veicoli').select('autista_id, targa').not('autista_id', 'is', null),
      ])
      setClienti((cl ?? []) as Cliente[])
      const targaMap: Record<number, string> = {}
      for (const v of (ve ?? [])) if (v.autista_id && v.targa) targaMap[v.autista_id] = v.targa
      setTargaByAutista(targaMap)
      setAutisti(
        ((au ?? []) as { id: number; nome: string | null; cognome: string | null }[])
          .map(a => ({ ...a, targa: targaMap[a.id] ?? null }))
      )
    }
    fetchLookup()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSpedizioni = useCallback(async (p = 0) => {
    setLoading(true)
    const SELECT = 'id, cliente_id, autista_id, origine, destinazione, peso_kg, mtl, ref_cliente, note, data_partenza, data_arrivo, targa_semirimorchio, stato, clienti(nome), autisti(nome, cognome)'

    let q = supabase.from('spedizioni').select(SELECT, { count: 'exact' })

    if (filtroStato) q = q.eq('stato', filtroStato)
    if (filtroDateFrom) q = q.gte('data_partenza', filtroDateFrom)
    if (filtroDateTo) q = q.lte('data_partenza', filtroDateTo)

    q = q.order('data_partenza', { ascending: false, nullsFirst: false })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)

    const { data, count } = await q
    let rows = (data ?? []) as unknown as Spedizione[]

    // Filtro search client-side (cliente, origine, destinazione, ref)
    if (search.trim()) {
      const s = search.toLowerCase()
      rows = rows.filter(r =>
        r.clienti?.nome?.toLowerCase().includes(s) ||
        r.origine?.toLowerCase().includes(s) ||
        r.destinazione?.toLowerCase().includes(s) ||
        r.ref_cliente?.toLowerCase().includes(s) ||
        r.autisti?.cognome?.toLowerCase().includes(s)
      )
    }

    setSpedizioni(rows)
    setTotal(count ?? 0)
    setPage(p)
    setLoading(false)
  }, [filtroStato, filtroDateFrom, filtroDateTo, search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSpedizioni(0) }, [fetchSpedizioni])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('spedizioni-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spedizioni' }, () => fetchSpedizioni(page))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [page, fetchSpedizioni]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(form: Form) {
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
    setCreating(false)
    fetchSpedizioni(0)
  }

  async function handleSave(form: Form) {
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
    fetchSpedizioni(page)
  }

  async function handleDelete() {
    if (!editing) return
    await supabase.from('spedizioni').delete().eq('id', editing.id)
    setEditing(null)
    fetchSpedizioni(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Spedizioni</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} spedizioni totali</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> Nuova Spedizione
        </button>
      </div>

      {/* ── Filtri ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca cliente, tratta, rif…"
            className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Stato */}
        <select
          value={filtroStato}
          onChange={e => setFiltroStato(e.target.value as Stato | '')}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
        >
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Date range */}
        <input type="date" value={filtroDateFrom} onChange={e => setFiltroDateFrom(e.target.value)}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" />
        <span className="text-slate-400 text-sm">→</span>
        <input type="date" value={filtroDateTo} onChange={e => setFiltroDateTo(e.target.value)}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" />

        {/* Reset filtri */}
        {(search || filtroStato || filtroDateFrom || filtroDateTo) && (
          <button
            onClick={() => { setSearch(''); setFiltroStato(''); setFiltroDateFrom(''); setFiltroDateTo('') }}
            className="text-xs text-blue-600 hover:underline px-2 py-2"
          >
            Azzera filtri
          </button>
        )}
      </div>

      {/* ── Tabella ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tratta</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Autista / Targhe</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Carico</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Scarico</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Stato</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Peso / MTL</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Rif.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : spedizioni.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">
                    Nessuna spedizione trovata
                  </td>
                </tr>
              ) : (
                spedizioni.map(s => {
                  const autistaNome = s.autisti
                    ? `${s.autisti.nome ?? ''} ${s.autisti.cognome ?? ''}`.trim()
                    : '—'
                  const targa = s.autista_id ? (targaByAutista[s.autista_id] ?? null) : null

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setEditing(s)}
                      className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">{s.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{s.clienti?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-medium">{s.origine || '—'}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-medium">{s.destinazione || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-600 text-xs mb-1">{autistaNome}</div>
                        <div className="flex gap-1 flex-wrap">
                          {targa && (
                            <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono">{targa}</span>
                          )}
                          {s.targa_semirimorchio && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">{s.targa_semirimorchio}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{fmtData(s.data_partenza)}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{fmtData(s.data_arrivo)}</td>
                      <td className="px-4 py-3"><StatoBadge stato={s.stato} /></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {s.peso_kg != null && <span>{s.peso_kg} kg</span>}
                        {s.peso_kg != null && s.mtl != null && <span className="text-slate-300 mx-1">·</span>}
                        {s.mtl != null && <span>{s.mtl} mtl</span>}
                        {s.peso_kg == null && s.mtl == null && '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                        {s.ref_cliente ? `#${s.ref_cliente}` : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              Pagina {page + 1} di {totalPages} · {total} totali
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchSpedizioni(page - 1)}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => fetchSpedizioni(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modali */}
      {editing && (
        <SpedizioneModal
          spedizione={editing} clienti={clienti} autisti={autisti} targaByAutista={targaByAutista}
          onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)}
        />
      )}
      {creating && (
        <SpedizioneModal
          clienti={clienti} autisti={autisti} targaByAutista={targaByAutista}
          onSave={handleCreate} onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}
