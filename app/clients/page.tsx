'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TopNav from '../TopNav'

type Contact = {
  contact_id: string
  whatsapp_number: string
  contact_name: string | null
  role: string | null
  is_primary: boolean
}

type Client = {
  client_id: string
  client_name: string
  legal_name: string | null
  entity_type: string | null
  city: string | null
  state: string | null
  status: string | null
  assigned_va: string | null
  client_contacts: Contact[]
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id, client_name, legal_name, entity_type, city, state, status, assigned_va, client_contacts(contact_id, whatsapp_number, contact_name, role, is_primary)')
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      else setClients((data as Client[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = clients.filter(c => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      c.client_name?.toLowerCase().includes(q) ||
      c.legal_name?.toLowerCase().includes(q) ||
      c.assigned_va?.toLowerCase().includes(q) ||
      c.client_contacts?.some(ct => ct.whatsapp_number?.includes(q))
    )
  })

  return (
    <div className="page">
      <TopNav />

      <main className="canvas">
        <div className="intro intro--row">
          <div>
            <h1 className="title">Clients</h1>
            <p className="subtitle">{clients.length} {clients.length === 1 ? 'client' : 'clients'} in the directory.</p>
          </div>
          <Link href="/" className="addBtn addBtn--solid">+ Add client</Link>
        </div>

        <input
          className="search"
          placeholder="Search by name, VA, or number…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="msgErr">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="muted">No clients found.</p>
        )}

        <div className="clientList">
          {filtered.map(c => (
            <div className="clientCard" key={c.client_id}>
              <div className="clientHead">
                <div>
                  <h3 className="clientName">{c.client_name}</h3>
                  {c.legal_name && <span className="clientLegal">{c.legal_name}</span>}
                </div>
                {c.status && <span className={`badge badge--${(c.status || '').toLowerCase()}`}>{c.status}</span>}
              </div>

              <div className="metaRow">
                {c.entity_type && <span className="meta">{c.entity_type}</span>}
                {(c.city || c.state) && <span className="meta">{[c.city, c.state].filter(Boolean).join(', ')}</span>}
                {c.assigned_va && <span className="meta">VA: {c.assigned_va}</span>}
              </div>

              {c.client_contacts?.length > 0 && (
                <div className="contactList">
                  {c.client_contacts.map(ct => (
                    <div className="contactPill" key={ct.contact_id}>
                      <span className="num">{ct.whatsapp_number}</span>
                      {ct.contact_name && <span className="who">{ct.contact_name}</span>}
                      {ct.role && <span className="who">· {ct.role}</span>}
                      {ct.is_primary && <span className="primaryTag">Primary</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
