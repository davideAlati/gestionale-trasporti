'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Save, Trash2, Wrench, ChevronRight } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Veicolo = {
  id: number
  targa: string
  marca: string | null
  modello: string | null
  categoria: string | null
}

type Manutenzione = {
  id: number
  data_intervento: string
  km: number | null
  descrizione: string | null
  tipologia_intervento: string | null
  targa: string
  costo: number | null
  fornitore: string | null
  created_at: string
}

type Form = {
  data_intervento: string
  tipologia_intervento: string
  km: string
  fornitore: string
  costo: string
  descrizione: string
}

const TIPOLOGIE = ['Tagliando', 'Pneumatici', 'Freni', 'Elettrico', 'Carrozzeria', 'Revisione', 'Altro']

const EMPTY_FORM: Form = {
  data_intervento: new Date().toISOString().slice(0, 10),
  tipologia_intervento: TIPOLOGIE[0],
  km: '',
  fornitore: '',
  costo: '',
  descrizione: '',
}

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtData(d: string) {
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

function fmtCosto(c: number | null) {
  if (c == null) return '—'
  return c.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function fmtKm(km: number | null) {
  if (km == null) return '—'
  return km.toLocaleString('it-IT') + ' km'
}

// ─── Autocomplete fornitore ───────────────────────────────────────────────────

function FornitoreInput({
  value, onChange, fornitori,
}: {
  value: string
  onChange: (v: string) => void
  fornitori: string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? fornitori.filter(f => f.toLowerCase().includes(value.toLowerCase()) && f.toLowerCase() !== value.toLowerCase())
    : []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        placeholder="Es. Officina Rossi"
        className={inputCls}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(f => (
            <li key={f}
              onMouseDown={() => { onChange(f); setOpen(false) }}
              className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer">
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Modal manutenzione ───────────────────────────────────────────────────────

function ManutenzioneModal({
  targa, manutenzione, fornitori, onSave, onDelete, onClose,
}: {
  targa: string
  manutenzione?: Manutenzione
  fornitori: string[]
  onSave: (form: Form) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const isNew = !manutenzione
  const [form, setForm] = useState<Form>(
    manutenzione ? {
      data_intervento:     manutenzione.data_intervento,
      tipologia_intervento: manutenzione.tipologia_intervento ?? TIPOLOGIE[0],
      km:          manutenzione.km != null ? String(manutenzione.km) : '',
      fornitore:   manutenzione.fornitore ?? '',
      costo:       manutenzione.costo != null ? String(manutenzione.costo) : '',
      descrizione: manutenzione.descrizione ?? '',
    } : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
              <Wrench size={15} className="text-amber-600" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">
              {isNew ? `Nuovo intervento — ${targa}` : `Modifica intervento — ${targa}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3.5">

          {/* Data */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Data intervento *</label>
            <input type="date" value={form.data_intervento}
              onChange={e => setForm(f => ({ ...f, data_intervento: e.target.value }))}
              className={input} />
          </div>

          {/* Tipologia */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Tipologia</label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOLOGIE.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tipologia_intervento: t }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    form.tipologia_intervento === t
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* KM / Costo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">KM al momento</label>
              <input type="number" value={form.km} onChange={e => setForm(f => ({ ...f, km: e.target.value }))}
                placeholder="150000" className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Costo (€)</label>
              <input type="number" step="0.01" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
                placeholder="0.00" className={input} />
            </div>
          </div>

          {/* Fornitore */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Fornitore</label>
            <FornitoreInput value={form.fornitore} onChange={v => setForm(f => ({ ...f, fornitore: v }))} fornitori={fornitori} />
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Descrizione</label>
            <textarea value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="Dettagli intervento…" rows={3}
              className={`${input} resize-none`} />
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
            <button onClick={handleSave} disabled={saving || !form.data_intervento}
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

export default function ManutenzioniPage() {
  const supabase = createClient()

  const [veicoli, setVeicoli] = useState<Veicolo[]>([])
  const [selected, setSelected] = useState<Veicolo | null>(null)
  const [manutenzioni, setManutenzioni] = useState<Manutenzione[]>([])
  const [fornitori, setFornitori] = useState<string[]>([])
  const [loadingVeicoli, setLoadingVeicoli] = useState(true)
  const [loadingManu, setLoadingManu] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Manutenzione | null>(null)

  // Fetch veicoli
  useEffect(() => {
    supabase.from('veicoli')
      .select('id, targa, marca, modello, categoria')
      .order('targa')
      .then(({ data }) => {
        setVeicoli((data ?? []) as Veicolo[])
        setLoadingVeicoli(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch fornitori distinti (per autocomplete)
  useEffect(() => {
    supabase.from('manutenzioni')
      .select('fornitore')
      .not('fornitore', 'is', null)
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map((r: any) => r.fornitore).filter(Boolean))] as string[] // eslint-disable-line @typescript-eslint/no-explicit-any
        setFornitori(unique.sort())
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchManutenzioni = useCallback(async (targa: string) => {
    setLoadingManu(true)
    const { data } = await supabase
      .from('manutenzioni')
      .select('*')
      .eq('targa', targa)
      .order('data_intervento', { ascending: false })
    setManutenzioni((data ?? []) as Manutenzione[])
    setLoadingManu(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function selectVeicolo(v: Veicolo) {
    setSelected(v)
    fetchManutenzioni(v.targa)
  }

  async function handleCreate(form: Form) {
    if (!selected) return
    await supabase.from('manutenzioni').insert({
      targa:                selected.targa,
      data_intervento:      form.data_intervento,
      tipologia_intervento: form.tipologia_intervento,
      km:                   form.km       ? Number(form.km)   : null,
      costo:                form.costo    ? Number(form.costo) : null,
      fornitore:            form.fornitore || null,
      descrizione:          form.descrizione || null,
    })
    setModalOpen(false)
    fetchManutenzioni(selected.targa)
    // Aggiorna fornitori con eventuale nuovo fornitore
    if (form.fornitore && !fornitori.includes(form.fornitore)) {
      setFornitori(prev => [...prev, form.fornitore].sort())
    }
  }

  async function handleSave(form: Form) {
    if (!editing) return
    await supabase.from('manutenzioni').update({
      data_intervento:      form.data_intervento,
      tipologia_intervento: form.tipologia_intervento,
      km:                   form.km       ? Number(form.km)   : null,
      costo:                form.costo    ? Number(form.costo) : null,
      fornitore:            form.fornitore || null,
      descrizione:          form.descrizione || null,
    }).eq('id', editing.id)
    setEditing(null)
    if (selected) fetchManutenzioni(selected.targa)
    if (form.fornitore && !fornitori.includes(form.fornitore)) {
      setFornitori(prev => [...prev, form.fornitore].sort())
    }
  }

  async function handleDelete() {
    if (!editing || !selected) return
    await supabase.from('manutenzioni').delete().eq('id', editing.id)
    setEditing(null)
    fetchManutenzioni(selected.targa)
  }

  const costoTotale = manutenzioni.reduce((acc, m) => acc + (m.costo ?? 0), 0)

  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)]">

      {/* ── Pannello sinistro: lista veicoli ── */}
      <div className="w-60 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Veicoli</h2>
        </div>
        {loadingVeicoli ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : veicoli.map(v => (
          <button key={v.targa} onClick={() => selectVeicolo(v)}
            className={`w-full flex items-center justify-between px-4 py-3 border-b border-slate-50 text-left transition-colors ${
              selected?.targa === v.targa
                ? 'bg-blue-50 border-l-2 border-l-blue-600'
                : 'hover:bg-slate-50'
            }`}>
            <div>
              <p className="text-sm font-bold font-mono text-slate-800">{v.targa}</p>
              <p className="text-[11px] text-slate-400">{v.marca} {v.modello}</p>
              {v.categoria && <p className="text-[10px] text-slate-300">{v.categoria}</p>}
            </div>
            {selected?.targa === v.targa && <ChevronRight size={14} className="text-blue-500 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* ── Pannello destro: interventi ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
            <div className="text-center">
              <Wrench size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">Seleziona un veicolo</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header pannello destro */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  {selected.targa} — {selected.marca} {selected.modello}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {manutenzioni.length} interventi · Costo totale: <span className="font-semibold text-slate-600">{fmtCosto(costoTotale)}</span>
                </p>
              </div>
              <button onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
                <Plus size={15} /> Nuovo intervento
              </button>
            </div>

            {/* Tabella interventi */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-auto h-full">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Data</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipologia</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">KM</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fornitore</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Costo</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Descrizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingManu ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" /></td>
                          ))}
                        </tr>
                      ))
                    ) : manutenzioni.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center">
                          <Wrench size={28} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-slate-400 text-sm">Nessun intervento registrato</p>
                        </td>
                      </tr>
                    ) : manutenzioni.map(m => (
                      <tr key={m.id} onClick={() => setEditing(m)}
                        className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors">
                        <td className="px-4 py-3.5 text-slate-700 font-semibold text-xs whitespace-nowrap">{fmtData(m.data_intervento)}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                            {m.tipologia_intervento ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{fmtKm(m.km)}</td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs">{m.fornitore ?? '—'}</td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs font-semibold">{fmtCosto(m.costo)}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs max-w-xs truncate">{m.descrizione ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal nuovo intervento */}
      {modalOpen && selected && (
        <ManutenzioneModal
          targa={selected.targa}
          fornitori={fornitori}
          onSave={handleCreate}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Modal modifica intervento */}
      {editing && selected && (
        <ManutenzioneModal
          targa={selected.targa}
          manutenzione={editing}
          fornitori={fornitori}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
