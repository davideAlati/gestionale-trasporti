'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, Save, Trash2, ChevronLeft, ChevronRight, Truck, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type StatoVeicolo = 'Attivo' | 'In manutenzione' | 'Fermo' | 'Venduto'
const STATI_VEICOLO: StatoVeicolo[] = ['Attivo', 'In manutenzione', 'Fermo', 'Venduto']

const STATO_VEI_CONFIG: Record<StatoVeicolo, { badge: string; text: string; icon: React.ReactNode }> = {
  'Attivo':          { badge: 'bg-green-50',  text: 'text-green-700', icon: <CheckCircle size={11} /> },
  'In manutenzione': { badge: 'bg-amber-50',  text: 'text-amber-700', icon: <Clock size={11} /> },
  'Fermo':           { badge: 'bg-red-50',    text: 'text-red-700',   icon: <AlertTriangle size={11} /> },
  'Venduto':         { badge: 'bg-slate-100', text: 'text-slate-500', icon: null },
}

type Veicolo = {
  id: number
  targa: string
  marca: string | null
  modello: string | null
  anno: number | null
  km_acquisto: number | null
  km_attuali: number | null
  autista_id: number | null
  stato: StatoVeicolo | null
  created_at: string | null
  autista_nome?: string | null
}

type Autista = { id: number; nome: string | null; cognome: string | null }

type Form = {
  targa: string
  marca: string
  modello: string
  anno: string
  km_acquisto: string
  km_attuali: string
  autista_id: string
  stato: StatoVeicolo
}

const PAGE_SIZE = 25

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtKm(km: number | null) {
  if (km == null) return '—'
  return km.toLocaleString('it-IT') + ' km'
}

// ─── Badge stato veicolo ──────────────────────────────────────────────────────

function StatoVeicoloBadge({ stato }: { stato: StatoVeicolo | null }) {
  if (!stato) return <span className="text-xs text-slate-300">—</span>
  const c = STATO_VEI_CONFIG[stato]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.badge} ${c.text}`}>
      {c.icon} {stato}
    </span>
  )
}

// ─── Modal veicolo ────────────────────────────────────────────────────────────

function VeicoloModal({
  veicolo, autisti, onSave, onDelete, onClose,
}: {
  veicolo?: Veicolo
  autisti: Autista[]
  onSave: (form: Form) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const isNew = !veicolo
  const [form, setForm] = useState<Form>({
    targa:       veicolo?.targa        ?? '',
    marca:       veicolo?.marca        ?? '',
    modello:     veicolo?.modello      ?? '',
    anno:        veicolo?.anno != null  ? String(veicolo.anno) : '',
    km_acquisto: veicolo?.km_acquisto != null ? String(veicolo.km_acquisto) : '',
    km_attuali:  veicolo?.km_attuali  != null ? String(veicolo.km_attuali)  : '',
    autista_id:  String(veicolo?.autista_id ?? ''),
    stato:       (veicolo?.stato as StatoVeicolo) ?? 'Attivo',
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
              <Truck size={16} className="text-slate-600" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">
              {isNew ? 'Nuovo Veicolo' : `${veicolo!.marca ?? ''} ${veicolo!.modello ?? ''} — ${veicolo!.targa}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3.5">

          {/* Targa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Targa *</label>
            <input type="text" value={form.targa}
              onChange={e => setForm(f => ({ ...f, targa: e.target.value.toUpperCase() }))}
              placeholder="AB123CD" disabled={!isNew}
              className={`${input} font-mono uppercase ${!isNew ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`} />
            {!isNew && <p className="text-[10px] text-slate-400 mt-0.5">La targa non può essere modificata</p>}
          </div>

          {/* Marca / Modello */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Marca</label>
              <input type="text" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                placeholder="Scania" className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Modello</label>
              <input type="text" value={form.modello} onChange={e => setForm(f => ({ ...f, modello: e.target.value }))}
                placeholder="R450" className={input} />
            </div>
          </div>

          {/* Anno */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Anno immatricolazione</label>
            <input type="number" value={form.anno} onChange={e => setForm(f => ({ ...f, anno: e.target.value }))}
              placeholder="2020" min="1990" max="2030" className={input} />
          </div>

          {/* KM acquisto / attuali */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">KM acquisto</label>
              <input type="number" value={form.km_acquisto} onChange={e => setForm(f => ({ ...f, km_acquisto: e.target.value }))}
                placeholder="0" className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">KM attuali</label>
              <input type="number" value={form.km_attuali} onChange={e => setForm(f => ({ ...f, km_attuali: e.target.value }))}
                placeholder="0" className={input} />
            </div>
          </div>

          {/* KM percorsi (calcolato) */}
          {form.km_acquisto && form.km_attuali && Number(form.km_attuali) > Number(form.km_acquisto) && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              KM percorsi con noi: <span className="font-bold">{(Number(form.km_attuali) - Number(form.km_acquisto)).toLocaleString('it-IT')} km</span>
            </div>
          )}

          {/* Autista */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Autista assegnato</label>
            <select value={form.autista_id} onChange={e => setForm(f => ({ ...f, autista_id: e.target.value }))} className={input}>
              <option value="">— Nessun autista —</option>
              {autisti.map(a => (
                <option key={a.id} value={a.id}>{a.cognome} {a.nome}</option>
              ))}
            </select>
          </div>

          {/* Stato */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Stato</label>
            <div className="flex flex-wrap gap-1.5">
              {STATI_VEICOLO.map(s => {
                const c = STATO_VEI_CONFIG[s]
                const isActive = s === form.stato
                return (
                  <button key={s} onClick={() => setForm(f => ({ ...f, stato: s }))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                      isActive ? `${c.badge} ${c.text} border-current` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}>
                    {c.icon} {s}
                  </button>
                )
              })}
            </div>
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
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-slate-500 text-xs hover:text-slate-700 transition-colors">
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
            <button onClick={handleSave} disabled={saving || !form.targa.trim()}
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

export default function VeicoliPage() {
  const [veicoli, setVeicoli] = useState<Veicolo[]>([])
  const [autisti, setAutisti] = useState<Autista[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState<StatoVeicolo | ''>('')
  const [editing, setEditing] = useState<Veicolo | null>(null)
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.from('autisti').select('id, nome, cognome').order('cognome')
      .then(({ data }) => setAutisti((data ?? []) as Autista[]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVeicoli = useCallback(async (p = 0) => {
    setLoading(true)

    let q = supabase
      .from('veicoli')
      .select('id, targa, marca, modello, anno, km_acquisto, km_attuali, autista_id, stato, created_at, autisti(nome, cognome)', { count: 'exact' })
      .order('targa', { ascending: true })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)

    if (filtroStato) q = q.eq('stato', filtroStato)
    if (search.trim()) q = q.or(`targa.ilike.%${search}%,marca.ilike.%${search}%,modello.ilike.%${search}%`)

    const { data, count } = await q

    const rows = (data ?? []).map((v: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      ...v,
      autista_nome: v.autisti ? `${v.autisti.cognome ?? ''} ${v.autisti.nome ?? ''}`.trim() : null,
    })) as Veicolo[]

    setVeicoli(rows)
    setTotal(count ?? 0)
    setPage(p)
    setLoading(false)
  }, [search, filtroStato]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchVeicoli(0) }, [fetchVeicoli])

  async function handleCreate(form: Form) {
    await supabase.from('veicoli').insert({
      targa:       form.targa,
      marca:       form.marca       || null,
      modello:     form.modello     || null,
      anno:        form.anno        ? Number(form.anno)        : null,
      km_acquisto: form.km_acquisto ? Number(form.km_acquisto) : null,
      km_attuali:  form.km_attuali  ? Number(form.km_attuali)  : null,
      autista_id:  form.autista_id  ? Number(form.autista_id)  : null,
      stato:       form.stato,
    })
    setCreating(false)
    fetchVeicoli(0)
  }

  async function handleSave(form: Form) {
    await supabase.from('veicoli').update({
      marca:       form.marca       || null,
      modello:     form.modello     || null,
      anno:        form.anno        ? Number(form.anno)        : null,
      km_acquisto: form.km_acquisto ? Number(form.km_acquisto) : null,
      km_attuali:  form.km_attuali  ? Number(form.km_attuali)  : null,
      autista_id:  form.autista_id  ? Number(form.autista_id)  : null,
      stato:       form.stato,
    }).eq('targa', editing!.targa)
    setEditing(null)
    fetchVeicoli(page)
  }

  async function handleDelete() {
    if (!editing) return
    await supabase.from('veicoli').delete().eq('targa', editing.targa)
    setEditing(null)
    fetchVeicoli(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Veicoli</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} veicoli registrati</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Nuovo Veicolo
        </button>
      </div>

      {/* Filtri */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca targa, marca, modello…"
            className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value as StatoVeicolo | '')}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700">
          <option value="">Tutti gli stati</option>
          {STATI_VEICOLO.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || filtroStato) && (
          <button onClick={() => { setSearch(''); setFiltroStato('') }} className="text-xs text-blue-600 hover:underline px-2 py-2">
            Azzera filtri
          </button>
        )}
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Targa</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Veicolo</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Anno</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">KM acquisto</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">KM attuali</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">KM percorsi</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Autista</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Stato</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : veicoli.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Truck size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">Nessun veicolo trovato</p>
                  </td>
                </tr>
              ) : veicoli.map(v => {
                const kmPercorsi = (v.km_acquisto != null && v.km_attuali != null)
                  ? v.km_attuali - v.km_acquisto : null
                return (
                  <tr key={v.targa} onClick={() => setEditing(v)}
                    className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-bold font-mono text-sm bg-slate-800 text-white px-2.5 py-1 rounded">
                        {v.targa}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{v.marca} {v.modello}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{v.anno ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{fmtKm(v.km_acquisto)}</td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs font-semibold">{fmtKm(v.km_attuali)}</td>
                    <td className="px-4 py-3.5 text-xs">
                      {kmPercorsi != null
                        ? <span className="text-blue-700 font-semibold">{kmPercorsi.toLocaleString('it-IT')} km</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{v.autista_nome ?? '—'}</td>
                    <td className="px-4 py-3.5"><StatoVeicoloBadge stato={v.stato} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">Pagina {page + 1} di {totalPages} · {total} totali</span>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchVeicoli(page - 1)} disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => fetchVeicoli(page + 1)} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {editing && <VeicoloModal veicolo={editing} autisti={autisti} onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />}
      {creating && <VeicoloModal autisti={autisti} onSave={handleCreate} onClose={() => setCreating(false)} />}
    </div>
  )
}
