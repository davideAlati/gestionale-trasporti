'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, Save, Trash2, ChevronLeft, ChevronRight, Building2, Package } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Cliente = {
  id: number
  nome: string | null
  email: string | null
  telefono: string | null
  indirizzo: string | null
  partita_iva: string | null
  nazione: string | null
  created_at: string | null
  spedizioni_count?: number
}

type Form = {
  nome: string
  email: string
  telefono: string
  indirizzo: string
  partita_iva: string
  nazione: string
}

const EMPTY_FORM: Form = { nome: '', email: '', telefono: '', indirizzo: '', partita_iva: '', nazione: '' }

const PAGE_SIZE = 25

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })
}

function initials(nome: string | null) {
  if (!nome) return '?'
  return nome.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Avatar cliente ───────────────────────────────────────────────────────────

function ClienteAvatar({ nome }: { nome: string | null }) {
  const colors = [
    'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700',
    'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
  ]
  const idx = (nome?.charCodeAt(0) ?? 0) % colors.length
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${colors[idx]}`}>
      {initials(nome)}
    </div>
  )
}

// ─── Modal cliente ────────────────────────────────────────────────────────────

function ClienteModal({
  cliente, onSave, onDelete, onClose,
}: {
  cliente?: Cliente
  onSave: (form: Form) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const isNew = !cliente
  const [form, setForm] = useState<Form>({
    nome:        cliente?.nome        ?? '',
    email:       cliente?.email       ?? '',
    telefono:    cliente?.telefono    ?? '',
    indirizzo:   cliente?.indirizzo   ?? '',
    partita_iva: cliente?.partita_iva ?? '',
    nazione:     cliente?.nazione     ?? '',
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {!isNew && <ClienteAvatar nome={cliente!.nome} />}
            <h2 className="text-[15px] font-bold text-slate-800">
              {isNew ? 'Nuovo Cliente' : `Modifica — ${cliente!.nome ?? 'Cliente'}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nome / Ragione Sociale *</label>
            <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Es. Rossi Trasporti Srl" className={input} autoFocus />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="info@azienda.it" className={input} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Telefono</label>
            <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              placeholder="+39 02 1234567" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Partita IVA</label>
              <input type="text" value={form.partita_iva} onChange={e => setForm(f => ({ ...f, partita_iva: e.target.value }))}
                placeholder="IT12345678901" className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nazione</label>
              <input type="text" value={form.nazione} onChange={e => setForm(f => ({ ...f, nazione: e.target.value }))}
                placeholder="Italia" className={input} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Indirizzo</label>
            <textarea value={form.indirizzo} onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))}
              placeholder="Via Roma 1, 20100 Milano" rows={2} className={`${input} resize-none`} />
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
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-slate-500 text-xs transition-colors hover:text-slate-700">
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
            <button onClick={handleSave} disabled={saving || !form.nome.trim()}
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

export default function ClientiPage() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  const fetchClienti = useCallback(async (p = 0) => {
    setLoading(true)

    let q = supabase
      .from('clienti')
      .select('id, nome, email, telefono, indirizzo, partita_iva, nazione, created_at', { count: 'exact' })
      .order('nome', { ascending: true })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)

    if (search.trim()) {
      q = q.or(`nome.ilike.%${search}%,email.ilike.%${search}%,telefono.ilike.%${search}%`)
    }

    const { data, count } = await q

    // Conta spedizioni per ogni cliente
    const rows = (data ?? []) as Cliente[]
    if (rows.length > 0) {
      const ids = rows.map(r => r.id)
      const { data: counts } = await supabase
        .from('spedizioni')
        .select('cliente_id')
        .in('cliente_id', ids)

      const countMap: Record<number, number> = {}
      for (const s of (counts ?? [])) {
        if (s.cliente_id) countMap[s.cliente_id] = (countMap[s.cliente_id] ?? 0) + 1
      }
      rows.forEach(r => { r.spedizioni_count = countMap[r.id] ?? 0 })
    }

    setClienti(rows)
    setTotal(count ?? 0)
    setPage(p)
    setLoading(false)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchClienti(0) }, [fetchClienti])

  async function handleCreate(form: Form) {
    await supabase.from('clienti').insert({
      nome:        form.nome        || null,
      email:       form.email       || null,
      telefono:    form.telefono    || null,
      indirizzo:   form.indirizzo   || null,
      partita_iva: form.partita_iva || null,
      nazione:     form.nazione     || null,
    })
    setCreating(false)
    fetchClienti(0)
  }

  async function handleSave(form: Form) {
    await supabase.from('clienti').update({
      nome:        form.nome        || null,
      email:       form.email       || null,
      telefono:    form.telefono    || null,
      indirizzo:   form.indirizzo   || null,
      partita_iva: form.partita_iva || null,
      nazione:     form.nazione     || null,
    }).eq('id', editing!.id)
    setEditing(null)
    fetchClienti(page)
  }

  async function handleDelete() {
    if (!editing) return
    await supabase.from('clienti').delete().eq('id', editing.id)
    setEditing(null)
    fetchClienti(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Clienti</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} clienti registrati</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> Nuovo Cliente
        </button>
      </div>

      {/* ── Ricerca ── */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, email, telefono…"
            className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Tabella ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Telefono</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">P. IVA</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nazione</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Indirizzo</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Spedizioni</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Registrato il</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clienti.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Building2 size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">Nessun cliente trovato</p>
                  </td>
                </tr>
              ) : (
                clienti.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setEditing(c)}
                    className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <ClienteAvatar nome={c.nome} />
                        <span className="font-semibold text-slate-800">{c.nome ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{c.email ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{c.telefono ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs font-mono">{c.partita_iva ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{c.nazione ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[200px] truncate">{c.indirizzo ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      {(c.spedizioni_count ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          <Package size={11} />
                          {c.spedizioni_count}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">{fmtData(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">Pagina {page + 1} di {totalPages} · {total} totali</span>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchClienti(page - 1)} disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => fetchClienti(page + 1)} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modali */}
      {editing && (
        <ClienteModal cliente={editing} onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />
      )}
      {creating && (
        <ClienteModal onSave={handleCreate} onClose={() => setCreating(false)} />
      )}
    </div>
  )
}
