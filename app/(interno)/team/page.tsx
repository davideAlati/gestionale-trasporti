'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Save, Trash2, UserCog, Mail, ShieldCheck, Shield } from 'lucide-react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Membro = {
  id: string
  email: string
  nome: string | null
  cognome: string | null
  role: 'admin' | 'staff'
  banned: boolean
  created_at: string
  last_sign_in: string | null
}

// ─── Utilità ─────────────────────────────────────────────────────────────────

function fmtData(d: string | null) {
  if (!d) return 'Mai'
  const dt = new Date(d)
  return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`
}

// ─── Modal invita ─────────────────────────────────────────────────────────────

function InvitaModal({ onInvited, onClose }: { onInvited: () => void; onClose: () => void }) {
  const [email, setEmail]     = useState('')
  const [nome, setNome]       = useState('')
  const [cognome, setCognome] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  async function handleInvita() {
    if (!email.trim()) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), nome, cognome }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Errore'); setSaving(false); return }
    onInvited()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
              <Mail size={15} className="text-blue-600" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800">Invita membro staff</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nome@esempio.com" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Mario" className={input} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cognome</label>
              <input type="text" value={cognome} onChange={e => setCognome(e.target.value)}
                placeholder="Rossi" className={input} />
            </div>
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <div className="bg-blue-50 rounded-lg px-3 py-2.5 text-xs text-blue-700">
            Il membro riceverà un'email con il link per impostare la password e accedere al gestionale.
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Annulla</button>
          <button onClick={handleInvita} disabled={saving || !email.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            <Save size={14} />
            {saving ? 'Invio…' : 'Invia invito'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const supabase = createClient()
  const [membri, setMembri]         = useState<Membro[]>([])
  const [loading, setLoading]       = useState(true)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [currentId, setCurrentId]   = useState<string | null>(null)
  const [invitaOpen, setInvitaOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      setCurrentId(user?.id ?? null)
      setIsAdmin(user?.user_metadata?.role === 'admin')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMembri() {
    setLoading(true)
    const res = await fetch('/api/team')
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setMembri(data.users ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMembri() }, [])

  async function toggleBan(membro: Membro) {
    setError(null)
    const res = await fetch(`/api/team/${membro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ban: !membro.banned }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    fetchMembri()
  }

  async function deleteMembro(id: string) {
    setError(null)
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setConfirmDel(null)
    fetchMembri()
  }

  if (!isAdmin && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheck size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm">Accesso riservato all'amministratore</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Team</h1>
          <p className="text-xs text-slate-500 mt-0.5">{membri.length} account registrati</p>
        </div>
        <button onClick={() => setInvitaOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Invita membro
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Tabella */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Membro</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ruolo</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Stato</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ultimo accesso</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Registrato il</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" /></td>
                  ))}
                </tr>
              ))
            ) : membri.map(m => {
              const isMe = m.id === currentId
              const isAdminRow = m.role === 'admin'
              return (
                <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {(m.cognome?.[0] ?? m.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {m.cognome || m.nome ? `${m.cognome ?? ''} ${m.nome ?? ''}`.trim() : '—'}
                          {isMe && <span className="ml-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">Tu</span>}
                        </p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isAdminRow ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isAdminRow ? <ShieldCheck size={10} /> : <Shield size={10} />}
                      {isAdminRow ? 'Admin' : 'Staff'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.banned ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                    }`}>
                      {m.banned ? 'Disabilitato' : 'Attivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">{fmtData(m.last_sign_in)}</td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{fmtData(m.created_at)}</td>
                  <td className="px-4 py-3.5">
                    {!isMe && !isAdminRow && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggleBan(m)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            m.banned
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}>
                          {m.banned ? 'Abilita' : 'Disabilita'}
                        </button>
                        {confirmDel === m.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteMembro(m.id)}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                              Conferma
                            </button>
                            <button onClick={() => setConfirmDel(null)}
                              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs transition-colors">
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDel(m.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {invitaOpen && (
        <InvitaModal onInvited={fetchMembri} onClose={() => setInvitaOpen(false)} />
      )}
    </div>
  )
}
