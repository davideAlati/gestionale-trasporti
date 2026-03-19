'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Plus, X, Save, Trash2, ChevronLeft, ChevronRight,
  User, Truck, Upload, FileText, ImageIcon, Eye, Loader2
} from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Autista = {
  id: number
  nome: string | null
  cognome: string | null
  patente: string | null
  telefono: string | null
  created_at: string | null
  targa?: string | null
}

type Documento = {
  id: number
  nome_file: string
  tipo_documento: string | null
  formato: string | null
  percorso_file: string | null
  created_at: string | null
}

type Form = {
  nome: string
  cognome: string
  patente: string
  telefono: string
}

const PAGE_SIZE = 25
const BUCKET = 'autisti-docs'

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })
}

function initials(nome: string | null, cognome: string | null) {
  return ((nome?.[0] ?? '') + (cognome?.[0] ?? '')).toUpperCase() || '?'
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
]

function AutoAvatar({ nome, cognome, size = 'md' }: { nome: string | null; cognome: string | null; size?: 'sm' | 'md' }) {
  const idx = ((nome?.charCodeAt(0) ?? 0) + (cognome?.charCodeAt(0) ?? 0)) % AVATAR_COLORS.length
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-[11px]'
  return (
    <div className={`rounded-full flex items-center justify-center font-bold shrink-0 ${sz} ${AVATAR_COLORS[idx]}`}>
      {initials(nome, cognome)}
    </div>
  )
}

function isImage(formato: string | null) {
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes((formato ?? '').toLowerCase())
}

// ─── Sezione documenti nel modal ──────────────────────────────────────────────

function DocumentiSection({ autistaId }: { autistaId: number }) {
  const supabase = createClient()
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [tipoDoc, setTipoDoc] = useState('Patente')
  const fileRef = useRef<HTMLInputElement>(null)

  const TIPI = ['Patente', 'CQC', 'Carta d\'identità', 'Contratto', 'Altro']

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documenti')
      .select('id, nome_file, tipo_documento, formato, percorso_file, created_at')
      .eq('entita_tipo', 'autista')
      .eq('entita_id', autistaId)
      .order('created_at', { ascending: false })
    setDocs((data ?? []) as Documento[])
    setLoading(false)
  }, [autistaId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const path = `${autistaId}/${Date.now()}_${file.name}`

    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file)
    if (uploadErr) {
      setUploadError(`Storage: ${uploadErr.message}`)
    } else {
      const { error: dbErr } = await supabase.from('documenti').insert({
        nome_file:      file.name,
        tipo_documento: tipoDoc,
        formato:        ext,
        entita_tipo:    'autista',
        entita_id:      autistaId,
        percorso_file:  path,
        dimensione_kb:  Math.round(file.size / 1024),
      })
      if (dbErr) {
        setUploadError(`Database: ${dbErr.message}`)
        // Rollback file dallo storage
        await supabase.storage.from(BUCKET).remove([path])
      } else {
        fetchDocs()
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(doc: Documento) {
    if (doc.percorso_file) await supabase.storage.from(BUCKET).remove([doc.percorso_file])
    await supabase.from('documenti').delete().eq('id', doc.id)
    fetchDocs()
  }

  async function handleView(doc: Documento) {
    if (!doc.percorso_file) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.percorso_file, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">Documenti</p>

      {/* Upload */}
      <div className="flex items-center gap-2 mb-3">
        <select
          value={tipoDoc}
          onChange={e => setTipoDoc(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TIPI.map(t => <option key={t}>{t}</option>)}
        </select>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Caricamento…' : 'Carica file'}
        </button>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
      </div>
      {uploadError && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">
          ⚠ {uploadError}
        </p>
      )}

      {/* Lista documenti */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
          Nessun documento caricato
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2.5 bg-slate-50 rounded-lg px-3 py-2 group">
              {/* Icona */}
              <div className="shrink-0 text-slate-400">
                {isImage(doc.formato)
                  ? <ImageIcon size={14} className="text-blue-400" />
                  : <FileText size={14} />}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{doc.nome_file}</p>
                <p className="text-[10px] text-slate-400">{doc.tipo_documento} · {fmtData(doc.created_at)}</p>
              </div>
              {/* Azioni */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleView(doc)}
                  className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors" title="Visualizza">
                  <Eye size={13} />
                </button>
                <button onClick={() => handleDelete(doc)}
                  className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors" title="Elimina">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal autista ────────────────────────────────────────────────────────────

function AutistaModal({
  autista, onSave, onDelete, onClose,
}: {
  autista?: Autista
  onSave: (form: Form) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const isNew = !autista
  const [form, setForm] = useState<Form>({
    nome:     autista?.nome     ?? '',
    cognome:  autista?.cognome  ?? '',
    patente:  autista?.patente  ?? '',
    telefono: autista?.telefono ?? '',
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
            {!isNew && <AutoAvatar nome={autista!.nome} cognome={autista!.cognome} />}
            <h2 className="text-[15px] font-bold text-slate-800">
              {isNew ? 'Nuovo Autista' : `${autista!.cognome ?? ''} ${autista!.nome ?? ''}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Veicolo assegnato */}
        {!isNew && autista!.targa && (
          <div className="mx-5 mt-4 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <Truck size={14} className="text-slate-500" />
            <span className="text-xs text-slate-500">Veicolo assegnato:</span>
            <span className="text-xs font-bold font-mono bg-slate-800 text-white px-2 py-0.5 rounded">{autista!.targa}</span>
          </div>
        )}

        {/* Form dati */}
        <div className="px-5 py-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nome *</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Mario" className={input} autoFocus />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cognome *</label>
              <input type="text" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))}
                placeholder="Rossi" className={input} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">N° Patente</label>
            <input type="text" value={form.patente}
              onChange={e => setForm(f => ({ ...f, patente: e.target.value.toUpperCase() }))}
              placeholder="AB1234567" className={`${input} font-mono uppercase`} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Telefono</label>
            <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              placeholder="+39 333 1234567" className={input} />
          </div>
        </div>

        {/* Documenti (solo in modifica) */}
        {!isNew && <DocumentiSection autistaId={autista!.id} />}

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
            <button onClick={handleSave} disabled={saving || !form.cognome.trim()}
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

export default function AutoristiPage() {
  const [autisti, setAutisti] = useState<Autista[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Autista | null>(null)
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  const fetchAutisti = useCallback(async (p = 0) => {
    setLoading(true)

    let q = supabase
      .from('autisti')
      .select('id, nome, cognome, patente, telefono, created_at', { count: 'exact' })
      .order('cognome', { ascending: true })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1)

    if (search.trim()) {
      q = q.or(`nome.ilike.%${search}%,cognome.ilike.%${search}%,telefono.ilike.%${search}%,patente.ilike.%${search}%`)
    }

    const { data, count } = await q
    const rows = (data ?? []) as Autista[]

    if (rows.length > 0) {
      const { data: veicoli } = await supabase
        .from('veicoli')
        .select('autista_id, targa')
        .in('autista_id', rows.map(r => r.id))
      const targaMap: Record<number, string> = {}
      for (const v of (veicoli ?? [])) if (v.autista_id) targaMap[v.autista_id] = v.targa
      rows.forEach(r => { r.targa = targaMap[r.id] ?? null })
    }

    setAutisti(rows)
    setTotal(count ?? 0)
    setPage(p)
    setLoading(false)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAutisti(0) }, [fetchAutisti])

  async function handleCreate(form: Form) {
    await supabase.from('autisti').insert({
      nome: form.nome || null, cognome: form.cognome || null,
      patente: form.patente || null, telefono: form.telefono || null,
    })
    setCreating(false)
    fetchAutisti(0)
  }

  async function handleSave(form: Form) {
    await supabase.from('autisti').update({
      nome: form.nome || null, cognome: form.cognome || null,
      patente: form.patente || null, telefono: form.telefono || null,
    }).eq('id', editing!.id)
    setEditing(null)
    fetchAutisti(page)
  }

  async function handleDelete() {
    if (!editing) return
    await supabase.from('autisti').delete().eq('id', editing.id)
    setEditing(null)
    fetchAutisti(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Autisti</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} autisti registrati</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Nuovo Autista
        </button>
      </div>

      {/* Ricerca */}
      <div className="mb-4">
        <div className="relative w-72">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca nome, cognome, patente…"
            className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Autista</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Telefono</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Patente</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Veicolo</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Registrato il</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : autisti.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <User size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">Nessun autista trovato</p>
                  </td>
                </tr>
              ) : autisti.map(a => (
                <tr key={a.id} onClick={() => setEditing(a)}
                  className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <AutoAvatar nome={a.nome} cognome={a.cognome} />
                      <span className="font-semibold text-slate-800">{a.cognome} {a.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{a.telefono ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{a.patente ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    {a.targa
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono bg-slate-800 text-white px-2 py-0.5 rounded"><Truck size={10} /> {a.targa}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{fmtData(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">Pagina {page + 1} di {totalPages} · {total} totali</span>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchAutisti(page - 1)} disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => fetchAutisti(page + 1)} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {editing && <AutistaModal autista={editing} onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />}
      {creating && <AutistaModal onSave={handleCreate} onClose={() => setCreating(false)} />}
    </div>
  )
}
