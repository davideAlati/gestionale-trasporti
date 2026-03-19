'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, FileText, Eye, Trash2, Upload, Loader2, FolderOpen, Building2 } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type EntitaTipo = 'autista' | 'veicolo' | 'aziendale'

type Documento = {
  id: number
  nome_file: string
  tipo_documento: string | null
  entita_tipo: EntitaTipo | null
  entita_id: number | null
  percorso_file: string | null
  note: string | null
  created_at: string
}

type Autista = { id: number; nome: string | null; cognome: string | null }
type Veicolo  = { id: number; targa: string }

const TIPI_DOC_AZIENDALI = ['Contratto', 'Fattura', 'Polizza', 'Certificato', 'Autorizzazione', 'Altro']

const BUCKET_MAP: Record<string, string> = {
  autista:    'autisti-docs',
  veicolo:    'veicoli-docs',
  aziendale:  'documenti-aziendali',
}

const ENTITA_LABEL: Record<string, string> = {
  autista:   'Autista',
  veicolo:   'Veicolo',
  aziendale: 'Aziendale',
}

const ENTITA_COLORS: Record<string, string> = {
  autista:   'bg-blue-50 text-blue-700',
  veicolo:   'bg-slate-100 text-slate-600',
  aziendale: 'bg-purple-50 text-purple-700',
}

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtData(d: string) {
  const dt = new Date(d)
  return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`
}

// ─── Modal carica documento aziendale ────────────────────────────────────────

function UploadModal({ onUploaded, onClose }: { onUploaded: () => void; onClose: () => void }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState(TIPI_DOC_AZIENDALI[0])
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const path = `aziendali/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documenti-aziendali').upload(path, file)
    if (upErr) { setError(`Errore upload: ${upErr.message}`); setUploading(false); return }

    const { error: dbErr } = await supabase.from('documenti').insert({
      nome_file:      file.name,
      tipo_documento: tipo,
      entita_tipo:    'aziendale',
      entita_id:      null,
      percorso_file:  path,
      note:           note || null,
    })
    if (dbErr) {
      setError(`Errore salvataggio: ${dbErr.message}`)
      await supabase.storage.from('documenti-aziendali').remove([path])
      setUploading(false)
      return
    }

    setUploading(false)
    onUploaded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
              <Building2 size={15} className="text-purple-600" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">Carica documento aziendale</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo documento</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className={input}>
              {TIPI_DOC_AZIENDALI.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Descrizione opzionale…" rows={2}
              className={`${input} resize-none`} />
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <label className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-semibold text-slate-500 hover:text-blue-600 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Caricamento…' : 'Seleziona file'}
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" />
          </label>
        </div>
      </div>
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function DocumentiPage() {
  const supabase = createClient()

  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [autisti, setAutisti]   = useState<Autista[]>([])
  const [veicoli, setVeicoli]   = useState<Veicolo[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtroEntita, setFiltroEntita] = useState<EntitaTipo | ''>('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [uploadOpen, setUploadOpen]     = useState(false)

  // Fetch lookup tables
  useEffect(() => {
    supabase.from('autisti').select('id, nome, cognome')
      .then(({ data }) => setAutisti((data ?? []) as Autista[]))
    supabase.from('veicoli').select('id, targa')
      .then(({ data }) => setVeicoli((data ?? []) as Veicolo[]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocumenti = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('documenti')
      .select('id, nome_file, tipo_documento, entita_tipo, entita_id, percorso_file, note, created_at')
      .order('created_at', { ascending: false })

    if (filtroEntita) q = q.eq('entita_tipo', filtroEntita)
    if (filtroTipo)   q = q.eq('tipo_documento', filtroTipo)
    if (search.trim()) q = q.ilike('nome_file', `%${search}%`)

    const { data } = await q
    setDocumenti((data ?? []) as Documento[])
    setLoading(false)
  }, [search, filtroEntita, filtroTipo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDocumenti() }, [fetchDocumenti])

  function resolveEntita(doc: Documento): string {
    if (!doc.entita_tipo || doc.entita_tipo === 'aziendale') return 'Aziendale'
    if (doc.entita_tipo === 'autista') {
      const a = autisti.find(x => x.id === doc.entita_id)
      return a ? `${a.cognome ?? ''} ${a.nome ?? ''}`.trim() : `Autista #${doc.entita_id}`
    }
    if (doc.entita_tipo === 'veicolo') {
      const v = veicoli.find(x => x.id === doc.entita_id)
      return v ? v.targa : `Veicolo #${doc.entita_id}`
    }
    return '—'
  }

  async function handleView(doc: Documento) {
    if (!doc.percorso_file) return
    const bucket = BUCKET_MAP[doc.entita_tipo ?? 'aziendale'] ?? 'documenti-aziendali'
    const { data } = await supabase.storage.from(bucket).createSignedUrl(doc.percorso_file, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`Eliminare "${doc.nome_file}"?`)) return
    if (doc.percorso_file) {
      const bucket = BUCKET_MAP[doc.entita_tipo ?? 'aziendale'] ?? 'documenti-aziendali'
      await supabase.storage.from(bucket).remove([doc.percorso_file])
    }
    await supabase.from('documenti').delete().eq('id', doc.id)
    fetchDocumenti()
  }

  // Tipi distinti per filtro
  const tipiDistinti = [...new Set(documenti.map(d => d.tipo_documento).filter(Boolean))].sort() as string[]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Documenti</h1>
          <p className="text-xs text-slate-500 mt-0.5">{documenti.length} documenti</p>
        </div>
        <button onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Carica documento
        </button>
      </div>

      {/* Filtri */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca nome file…"
            className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>

        <select value={filtroEntita} onChange={e => setFiltroEntita(e.target.value as EntitaTipo | '')}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700">
          <option value="">Tutte le entità</option>
          <option value="autista">Autisti</option>
          <option value="veicolo">Veicoli</option>
          <option value="aziendale">Aziendali</option>
        </select>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700">
          <option value="">Tutti i tipi</option>
          {tipiDistinti.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {(search || filtroEntita || filtroTipo) && (
          <button onClick={() => { setSearch(''); setFiltroEntita(''); setFiltroTipo('') }}
            className="text-xs text-blue-600 hover:underline px-2 py-2">
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
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">File</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Entità</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Collegato a</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Note</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : documenti.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <FolderOpen size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">Nessun documento trovato</p>
                  </td>
                </tr>
              ) : documenti.map(doc => {
                const entitaTipo = doc.entita_tipo ?? 'aziendale'
                return (
                  <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-slate-700 text-xs font-semibold truncate max-w-[180px]">{doc.nome_file}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{doc.tipo_documento ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${ENTITA_COLORS[entitaTipo] ?? 'bg-slate-100 text-slate-500'}`}>
                        {ENTITA_LABEL[entitaTipo] ?? entitaTipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{resolveEntita(doc)}</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs max-w-[160px] truncate">{doc.note ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">{fmtData(doc.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleView(doc)}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors" title="Visualizza">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleDelete(doc)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors" title="Elimina">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {uploadOpen && (
        <UploadModal onUploaded={fetchDocumenti} onClose={() => setUploadOpen(false)} />
      )}
    </div>
  )
}
