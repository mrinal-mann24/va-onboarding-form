'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TopNav from '../TopNav'
import ClientForm, { type ClientValues, type ContactValues } from '../ClientForm'
import { updateClient } from '@/lib/saveClient'

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
  gstin: string | null
  pan: string | null
  entity_type: string | null
  industry: string | null
  city: string | null
  state: string | null
  onboarding_date: string | null
  status: string | null
  assigned_va: string | null
  client_contacts: Contact[]
}

const SELECT =
  'client_id, client_name, legal_name, gstin, pan, entity_type, industry, city, state, onboarding_date, status, assigned_va, ' +
  'client_contacts(contact_id, whatsapp_number, contact_name, role, is_primary)'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Client | null>(null)

  async function load() {
    const { data, error } = await supabase
      .from('clients')
      .select(SELECT)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setClients((data as unknown as Client[]) || [])
    setLoading(false)
  }

  useEffect(() => {
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

        <div className="folderGrid">
          {filtered.map(c => {
            const count = c.client_contacts?.length || 0
            return (
              <div className="folder" key={c.client_id}>
                <div className="folderTab" />
                <div className="folderBody">
                  <div className="folderIcon" aria-hidden>
                    <FolderGlyph />
                  </div>
                  <div className="folderInfo">
                    <h3 className="folderName" title={c.client_name}>{c.client_name}</h3>
                    <p className="folderMeta">
                      {count} {count === 1 ? 'number' : 'numbers'}
                      {c.assigned_va ? ` · ${c.assigned_va}` : ''}
                    </p>
                  </div>
                  {c.status && (
                    <span className={`statusDot statusDot--${(c.status || '').toLowerCase()}`} title={c.status} />
                  )}
                </div>

                {/* hover actions */}
                <div className="folderActions">
                  <button className="folderBtn" disabled title="Coming soon">View</button>
                  <button className="folderBtn folderBtn--primary" onClick={() => setEditing(c)}>Edit</button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {editing && (
        <EditModal
          client={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            setLoading(true)
            await load()
          }}
        />
      )}
    </div>
  )
}

function EditModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client
  onClose: () => void
  onSaved: () => void
}) {
  const initialClient: ClientValues = {
    client_name: client.client_name ?? '',
    legal_name: client.legal_name ?? '',
    gstin: client.gstin ?? '',
    pan: client.pan ?? '',
    entity_type: client.entity_type ?? '',
    industry: client.industry ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    onboarding_date: client.onboarding_date ?? '',
    status: client.status ?? 'Active',
    assigned_va: client.assigned_va ?? '',
  }

  const initialContacts: ContactValues[] = (client.client_contacts ?? []).map(ct => ({
    contact_id: ct.contact_id,
    whatsapp_number: ct.whatsapp_number ?? '',
    contact_name: ct.contact_name ?? '',
    role: ct.role ?? '',
    is_primary: ct.is_primary,
  }))

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={e => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <p className="eyebrow">Edit client</p>
            <h2 className="modalTitle">{client.client_name}</h2>
          </div>
          <button className="modalClose" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modalBody">
          <ClientForm
            initialClient={initialClient}
            initialContacts={initialContacts}
            submitLabel="Save changes"
            onSave={(cv, contacts) => updateClient(client.client_id, cv, contacts, initialContacts)}
            onSuccess={onSaved}
          />
        </div>
      </div>
    </div>
  )
}

function FolderGlyph() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 6.5C3 5.67 3.67 5 4.5 5h4.3c.4 0 .78.16 1.06.44L11.2 6.8c.28.28.66.44 1.06.44H19.5c.83 0 1.5.67 1.5 1.5v9.26c0 .83-.67 1.5-1.5 1.5h-15C3.67 19.5 3 18.83 3 18V6.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
