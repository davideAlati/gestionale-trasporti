'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, Save, Trash2, ChevronLeft, ChevronRight, ClipboardList, FileDown } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type StatoPreventivo = 'Bozza' | 'Inviato' | 'Accettato' | 'Rifiutato'
const STATI: StatoPreventivo[] = ['Bozza', 'Inviato', 'Accettato', 'Rifiutato']

const STATO_CONFIG: Record<StatoPreventivo, { badge: string; text: string }> = {
  'Bozza':     { badge: 'bg-slate-100',  text: 'text-slate-500' },
  'Inviato':   { badge: 'bg-blue-50',    text: 'text-blue-700'  },
  'Accettato': { badge: 'bg-green-50',   text: 'text-green-700' },
  'Rifiutato': { badge: 'bg-red-50',     text: 'text-red-700'   },
}

type Cliente = { id: number; nome: string }

type VoceForm = {
  id?: number        // presente se già salvata in DB
  carico: string
  scarico: string
  descrizione: string
  km: string
  mtl: string
  peso: string
  importo: string
}

type Preventivo = {
  id: number
  cliente_id: number | null
  descrizione: string | null
  importo: number | null
  data: string | null
  stato: StatoPreventivo | null
  created_at: string
  cliente_nome?: string | null
  n_voci?: number
}

type Form = {
  cliente_id: string
  data: string
  stato: StatoPreventivo
  descrizione: string
  voci: VoceForm[]
}

const PAGE_SIZE = 20

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtData(d: string | null) {
  if (!d) return '—'
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}`
}

function newVoce(): VoceForm {
  return { carico: '', scarico: '', descrizione: '', km: '', mtl: '', peso: '', importo: '' }
}

// ─── Badge stato ──────────────────────────────────────────────────────────────

function StatoBadge({ stato }: { stato: StatoPreventivo | null }) {
  if (!stato) return <span className="text-xs text-slate-300">—</span>
  const c = STATO_CONFIG[stato]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c.badge} ${c.text}`}>
      {stato}
    </span>
  )
}

// ─── Riga voce ────────────────────────────────────────────────────────────────

function VoceRow({
  voce, index, onChange, onRemove,
}: {
  voce: VoceForm
  index: number
  onChange: (v: VoceForm) => void
  onRemove: () => void
}) {
  const cell = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white w-full'

  return (
    <div className="grid gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voce {index + 1}</span>
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Carico / Scarico */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Carico</label>
          <input type="text" value={voce.carico} onChange={e => onChange({ ...voce, carico: e.target.value })}
            placeholder="Città partenza" className={cell} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Scarico</label>
          <input type="text" value={voce.scarico} onChange={e => onChange({ ...voce, scarico: e.target.value })}
            placeholder="Città arrivo" className={cell} />
        </div>
      </div>

      {/* Descrizione */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Descrizione</label>
        <input type="text" value={voce.descrizione} onChange={e => onChange({ ...voce, descrizione: e.target.value })}
          placeholder="Es. Trasporto merce refrigerata" className={cell} />
      </div>

      {/* KM / MTL / Peso / Importo */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">KM</label>
          <input type="number" value={voce.km} onChange={e => onChange({ ...voce, km: e.target.value })}
            placeholder="0" className={cell} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">MTL</label>
          <input type="number" step="0.01" value={voce.mtl} onChange={e => onChange({ ...voce, mtl: e.target.value })}
            placeholder="0.00" className={cell} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Peso (kg)</label>
          <input type="number" value={voce.peso} onChange={e => onChange({ ...voce, peso: e.target.value })}
            placeholder="0" className={cell} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Importo (€)</label>
          <input type="number" step="0.01" value={voce.importo} onChange={e => onChange({ ...voce, importo: e.target.value })}
            placeholder="0.00" className={cell} />
        </div>
      </div>
    </div>
  )
}

// ─── Modal preventivo ─────────────────────────────────────────────────────────

function PreventivoModal({
  preventivo, clienti, onSave, onDelete, onClose,
}: {
  preventivo?: Preventivo
  clienti: Cliente[]
  onSave: (form: Form, vociDaEliminare: number[]) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const isNew = !preventivo
  const [form, setForm] = useState<Form>({
    cliente_id:  String(preventivo?.cliente_id ?? ''),
    data:        preventivo?.data ?? new Date().toISOString().slice(0, 10),
    stato:       (preventivo?.stato as StatoPreventivo) ?? 'Bozza',
    descrizione: preventivo?.descrizione ?? '',
    voci:        [],
  })
  const [vociDaEliminare, setVociDaEliminare] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadingVoci, setLoadingVoci] = useState(!isNew)

  const supabase = createClient()

  // Carica voci esistenti in edit
  useEffect(() => {
    if (!preventivo) return
    supabase.from('preventivi_voci')
      .select('*')
      .eq('preventivo_id', preventivo.id)
      .order('id')
      .then(({ data }) => {
        const voci: VoceForm[] = (data ?? []).map((v: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id:          v.id,
          carico:      v.carico      ?? '',
          scarico:     v.scarico     ?? '',
          descrizione: v.descrizione ?? '',
          km:          v.km   != null ? String(v.km)   : '',
          mtl:         v.mtl  != null ? String(v.mtl)  : '',
          peso:        v.peso != null ? String(v.peso) : '',
          importo:     v.importo != null ? String(v.importo) : '',
        }))
        setForm(f => ({ ...f, voci }))
        setLoadingVoci(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function addVoce() {
    setForm(f => ({ ...f, voci: [...f.voci, newVoce()] }))
  }

  function updateVoce(i: number, v: VoceForm) {
    setForm(f => ({ ...f, voci: f.voci.map((x, idx) => idx === i ? v : x) }))
  }

  function removeVoce(i: number) {
    const voce = form.voci[i]
    if (voce.id) setVociDaEliminare(prev => [...prev, voce.id!])
    setForm(f => ({ ...f, voci: f.voci.filter((_, idx) => idx !== i) }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(form, vociDaEliminare)
    setSaving(false)
  }

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const clienteNome = clienti.find(c => String(c.id) === form.cliente_id)?.nome ?? '—'
    const pageW = 210
    const margin = 18
    const colW = pageW - margin * 2
    let y = margin

    // ── Header ──
    doc.setFillColor(30, 58, 138) // blue-900
    doc.rect(0, 0, pageW, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`PREVENTIVO #${preventivo?.id ?? '—'}`, margin, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Data: ${fmtData(form.data)}   Stato: ${form.stato}`, margin, 20)
    y = 36

    // ── Cliente ──
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Cliente', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(clienteNome, margin + 22, y)
    y += 7

    // ── Note ──
    if (form.descrizione.trim()) {
      doc.setFont('helvetica', 'bold')
      doc.text('Note', margin, y)
      doc.setFont('helvetica', 'normal')
      const noteLines = doc.splitTextToSize(form.descrizione, colW - 22)
      doc.text(noteLines, margin + 22, y)
      y += noteLines.length * 5 + 3
    }

    y += 4
    // ── Separatore ──
    doc.setDrawColor(203, 213, 225)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // ── Intestazione tabella voci ──
    if (form.voci.length > 0) {
      doc.setFillColor(241, 245, 249) // slate-100
      doc.rect(margin, y - 1, colW, 7, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)

      const cols = [
        { label: 'Carico',      x: margin,       w: 34 },
        { label: 'Scarico',     x: margin + 34,  w: 34 },
        { label: 'Descrizione', x: margin + 68,  w: 48 },
        { label: 'KM',          x: margin + 116, w: 16 },
        { label: 'MTL',         x: margin + 132, w: 16 },
        { label: 'Peso (kg)',   x: margin + 148, w: 20 },
        { label: 'Importo €',   x: margin + 168, w: 24 },
      ]
      cols.forEach(c => doc.text(c.label, c.x, y + 4.5))
      y += 9

      // ── Righe voci ──
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 41, 59)
      form.voci.forEach((v, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, y - 1, colW, 7, 'F')
        }
        doc.setFontSize(8)
        const trunc = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + '…' : s
        doc.text(trunc(v.carico, 18),      cols[0].x, y + 4.5)
        doc.text(trunc(v.scarico, 18),     cols[1].x, y + 4.5)
        doc.text(trunc(v.descrizione, 24), cols[2].x, y + 4.5)
        doc.text(v.km      || '—', cols[3].x, y + 4.5)
        doc.text(v.mtl     || '—', cols[4].x, y + 4.5)
        doc.text(v.peso    || '—', cols[5].x, y + 4.5)
        doc.text(v.importo ? `€ ${Number(v.importo).toLocaleString('it-IT')}` : '—', cols[6].x, y + 4.5)
        y += 8

        if (y > 270) {
          doc.addPage()
          y = margin
        }
      })
    } else {
      doc.setFontSize(9)
      doc.setTextColor(148, 163, 184)
      doc.text('Nessuna voce inserita', margin, y + 4)
      y += 12
    }

    // ── Footer pagina ──
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, margin, 290)

    doc.save(`preventivo_${preventivo?.id ?? 'nuovo'}_${clienteNome.replace(/\s+/g, '_')}.pdf`)
  }

  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
              <ClipboardList size={15} className="text-blue-600" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">
              {isNew ? 'Nuovo Preventivo' : `Preventivo #${preventivo!.id}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Dati generali */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cliente</label>
              <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} className={input}>
                <option value="">— Seleziona cliente —</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={input} />
            </div>
          </div>

          {/* Stato */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Stato</label>
            <div className="flex gap-1.5 flex-wrap">
              {STATI.map(s => {
                const c = STATO_CONFIG[s]
                return (
                  <button key={s} onClick={() => setForm(f => ({ ...f, stato: s }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                      form.stato === s ? `${c.badge} ${c.text} border-current` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Note / Descrizione</label>
            <textarea value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="Eventuali note sul preventivo…" rows={2}
              className={`${input} resize-none`} />
          </div>

          {/* Voci */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Voci</label>
              <button onClick={addVoce}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus size={12} /> Aggiungi voce
              </button>
            </div>

            {loadingVoci ? (
              <div className="text-xs text-slate-400 py-2">Caricamento voci…</div>
            ) : form.voci.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">Nessuna voce aggiunta</div>
            ) : (
              <div className="space-y-2">
                {form.voci.map((v, i) => (
                  <VoceRow key={i} voce={v} index={i}
                    onChange={updated => updateVoce(i, updated)}
                    onRemove={() => removeVoce(i)} />
                ))}
              </div>
            )}
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
            {!isNew && (
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-sm font-semibold rounded-xl transition-colors border border-slate-200">
                <FileDown size={14} /> PDF
              </button>
            )}
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

export default function PreventiviPage() {
  const supabase = createClient()

  const [preventivi, setPreventivi] = useState<Preventivo[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState<StatoPreventivo | ''>('')
  const [editing, setEditing] = useState<Preventivo | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.from('clienti').select('id, nome').order('nome')
      .then(({ data }) => setClienti((data ?? []) as Cliente[]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPreventivi = useCallback(async (p = 0) => {
    setLoading(true)

    let q = supabase
      .from('preventivi')
      .select('id, cliente_id, descrizione, importo, data, stato, created_at, clienti(nome)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)

    if (filtroStato) q = q.eq('stato', filtroStato)

    const { data, count } = await q

    // Fetch voci count per ogni preventivo
    const ids = (data ?? []).map((p: any) => p.id) // eslint-disable-line @typescript-eslint/no-explicit-any
    let vociCounts: Record<number, number> = {}
    if (ids.length > 0) {
      const { data: voci } = await supabase
        .from('preventivi_voci')
        .select('preventivo_id')
        .in('preventivo_id', ids)
      ;(voci ?? []).forEach((v: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        vociCounts[v.preventivo_id] = (vociCounts[v.preventivo_id] ?? 0) + 1
      })
    }

    const rows = (data ?? []).map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      ...p,
      cliente_nome: p.clienti?.nome ?? null,
      n_voci: vociCounts[p.id] ?? 0,
    })) as Preventivo[]

    // Filtro client-side per search (cliente nome)
    const filtered = search.trim()
      ? rows.filter(p => p.cliente_nome?.toLowerCase().includes(search.toLowerCase()))
      : rows

    setPreventivi(filtered)
    setTotal(count ?? 0)
    setPage(p)
    setLoading(false)
  }, [search, filtroStato]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPreventivi(0) }, [fetchPreventivi])

  async function handleCreate(form: Form, _vociDaEliminare: number[]) {
    const { data } = await supabase.from('preventivi').insert({
      cliente_id:  form.cliente_id ? Number(form.cliente_id) : null,
      data:        form.data || null,
      stato:       form.stato,
      descrizione: form.descrizione || null,
    }).select('id').single()

    if (data && form.voci.length > 0) {
      await supabase.from('preventivi_voci').insert(
        form.voci.map(v => ({
          preventivo_id: data.id,
          carico:      v.carico      || null,
          scarico:     v.scarico     || null,
          descrizione: v.descrizione || null,
          km:          v.km      ? Number(v.km)      : null,
          mtl:         v.mtl     ? Number(v.mtl)     : null,
          peso:        v.peso    ? Number(v.peso)    : null,
          importo:     v.importo ? Number(v.importo) : null,
        }))
      )
    }
    setCreating(false)
    fetchPreventivi(0)
  }

  async function handleSave(form: Form, vociDaEliminare: number[]) {
    if (!editing) return

    await supabase.from('preventivi').update({
      cliente_id:  form.cliente_id ? Number(form.cliente_id) : null,
      data:        form.data || null,
      stato:       form.stato,
      descrizione: form.descrizione || null,
    }).eq('id', editing.id)

    // Elimina voci rimosse
    if (vociDaEliminare.length > 0) {
      await supabase.from('preventivi_voci').delete().in('id', vociDaEliminare)
    }

    // Upsert voci (update quelle con id, insert nuove)
    for (const v of form.voci) {
      const payload = {
        preventivo_id: editing.id,
        carico:      v.carico      || null,
        scarico:     v.scarico     || null,
        descrizione: v.descrizione || null,
        km:          v.km      ? Number(v.km)      : null,
        mtl:         v.mtl     ? Number(v.mtl)     : null,
        peso:        v.peso    ? Number(v.peso)    : null,
        importo:     v.importo ? Number(v.importo) : null,
      }
      if (v.id) {
        await supabase.from('preventivi_voci').update(payload).eq('id', v.id)
      } else {
        await supabase.from('preventivi_voci').insert(payload)
      }
    }

    setEditing(null)
    fetchPreventivi(page)
  }

  async function handleDelete() {
    if (!editing) return
    await supabase.from('preventivi').delete().eq('id', editing.id)
    setEditing(null)
    fetchPreventivi(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Preventivi</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} preventivi totali</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Nuovo Preventivo
        </button>
      </div>

      {/* Filtri */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca cliente…"
            className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value as StatoPreventivo | '')}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700">
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s}</option>)}
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
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">N° voci</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Note</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Stato</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : preventivi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <ClipboardList size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">Nessun preventivo trovato</p>
                  </td>
                </tr>
              ) : preventivi.map(p => (
                <tr key={p.id} onClick={() => setEditing(p)}
                  className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5 text-slate-400 text-xs font-mono">#{p.id}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{p.cliente_nome ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">{fmtData(p.data)}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {p.n_voci ? <span className="font-semibold text-slate-700">{p.n_voci}</span> : <span className="text-slate-300">0</span>}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs max-w-xs truncate">{p.descrizione ?? '—'}</td>
                  <td className="px-4 py-3.5"><StatoBadge stato={p.stato} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">Pagina {page + 1} di {totalPages} · {total} totali</span>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchPreventivi(page - 1)} disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => fetchPreventivi(page + 1)} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <PreventivoModal preventivo={editing} clienti={clienti}
          onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />
      )}
      {creating && (
        <PreventivoModal clienti={clienti}
          onSave={handleCreate} onClose={() => setCreating(false)} />
      )}
    </div>
  )
}
