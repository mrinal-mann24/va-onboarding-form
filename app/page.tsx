'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopNav from './TopNav'

const VA_NAMES = ['Vishrutha', 'Harsh', 'Abhishek', 'Jeffrey', 'Eshita', 'Mehak']
const ENTITY_TYPES = ['Pvt Ltd', 'LLP', 'Proprietorship', 'Partnership']
const ROLES = ['Owner', 'Accountant', 'Partner', 'Staff']

type Contact = {
  whatsapp_number: string
  contact_name: string
  role: string
  is_primary: boolean
}

const emptyClient = {
  client_name: '', legal_name: '', gstin: '', pan: '',
  entity_type: '', industry: '', city: '', state: '',
  onboarding_date: '', status: 'Active', assigned_va: '',
}

export default function AddClientPage() {
  const [client, setClient] = useState(emptyClient)
  const [contacts, setContacts] = useState<Contact[]>([
    { whatsapp_number: '', contact_name: '', role: '', is_primary: true },
  ])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function updateClient(field: string, value: string) {
    setClient({ ...client, [field]: value })
  }
  function updateContact(i: number, field: string, value: string | boolean) {
    const next = [...contacts]
    next[i] = { ...next[i], [field]: value }
    setContacts(next)
  }
  function addContact() {
    setContacts([...contacts, { whatsapp_number: '', contact_name: '', role: '', is_primary: false }])
  }
  function removeContact(i: number) {
    setContacts(contacts.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!client.client_name) {
      setMessage({ type: 'err', text: 'Client name is required.' })
      return
    }
    setSaving(true)
    setMessage(null)

    const payload = { ...client, onboarding_date: client.onboarding_date || null }
    const { data: clientData, error: clientError } = await supabase
      .from('clients').insert([payload]).select().single()

    if (clientError) {
      setMessage({ type: 'err', text: clientError.message })
      setSaving(false)
      return
    }

    const toInsert = contacts
      .filter(c => c.whatsapp_number)
      .map(c => ({ ...c, client_id: clientData.client_id }))

    if (toInsert.length) {
      const { error } = await supabase.from('client_contacts').insert(toInsert)
      if (error) {
        setMessage({ type: 'err', text: 'Client saved, but contacts failed: ' + error.message })
        setSaving(false)
        return
      }
    }

    // Mirror to the Google Sheet. If the sheet is configured but the append
    // fails, treat it as a hard failure (strict mode). If it's not configured
    // the route returns { skipped: true } and we carry on.
    try {
      const res = await fetch('/api/save-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: payload, contacts }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage({
          type: 'err',
          text:
            'Saved to database, but the Google Sheet update failed: ' +
            (data.error || res.statusText),
        })
        setSaving(false)
        return
      }
    } catch {
      setMessage({
        type: 'err',
        text: 'Saved to database, but could not reach the Google Sheet service.',
      })
      setSaving(false)
      return
    }

    setMessage({ type: 'ok', text: `${client.client_name} has been added.` })
    setClient(emptyClient)
    setContacts([{ whatsapp_number: '', contact_name: '', role: '', is_primary: true }])
    setSaving(false)
  }

  return (
    <div className="page">
      <TopNav />

      <main className="split">
        {/* left editorial panel */}
        <aside className="splitIntro">
          <div className="blob blob--a" />
          <div className="blob blob--b" />
          <div className="introInner">
            <p className="eyebrow">Client directory</p>
            <h1 className="display">Onboard a<br />new client</h1>
            <p className="lede">
              Add a business and its WhatsApp contacts to the directory.
              The bot uses these numbers to file documents to the right client.
            </p>
            <ul className="cues">
              <li>One record per business</li>
              <li>Multiple WhatsApp numbers supported</li>
              <li>Assign a VA to own the account</li>
            </ul>
          </div>
        </aside>

        {/* right form card */}
        <section className="splitForm">
          <div className="formCard">
            <SectionLabel>Business details</SectionLabel>

            <div className="grid">
              <Field label="Client name" required>
                <input className="uinput" value={client.client_name} onChange={e => updateClient('client_name', e.target.value)} placeholder="Acme Pvt Ltd" />
              </Field>
              <Field label="Legal name">
                <input className="uinput" value={client.legal_name} onChange={e => updateClient('legal_name', e.target.value)} placeholder="Registered name" />
              </Field>
              <Field label="GSTIN">
                <input className="uinput" value={client.gstin} onChange={e => updateClient('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </Field>
              <Field label="PAN">
                <input className="uinput" value={client.pan} onChange={e => updateClient('pan', e.target.value)} placeholder="AAAAA0000A" />
              </Field>
              <Field label="Entity type">
                <select className="uinput" value={client.entity_type} onChange={e => updateClient('entity_type', e.target.value)}>
                  <option value="">Select</option>
                  {ENTITY_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Industry">
                <input className="uinput" value={client.industry} onChange={e => updateClient('industry', e.target.value)} placeholder="e.g. Retail" />
              </Field>
              <Field label="City">
                <input className="uinput" value={client.city} onChange={e => updateClient('city', e.target.value)} />
              </Field>
              <Field label="State">
                <input className="uinput" value={client.state} onChange={e => updateClient('state', e.target.value)} />
              </Field>
              <Field label="Onboarding date">
                <input type="date" className="uinput" value={client.onboarding_date} onChange={e => updateClient('onboarding_date', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className="uinput" value={client.status} onChange={e => updateClient('status', e.target.value)}>
                  <option>Active</option><option>Inactive</option><option>Paused</option>
                </select>
              </Field>
              <Field label="Assigned VA">
                <select className="uinput" value={client.assigned_va} onChange={e => updateClient('assigned_va', e.target.value)}>
                  <option value="">Select VA</option>
                  {VA_NAMES.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
            </div>

            <div className="sectionGap" />

            <SectionLabel>WhatsApp contacts</SectionLabel>

            <div className="contacts">
              {contacts.map((c, i) => (
                <div className="contactRow" key={i}>
                  <Field label="WhatsApp number">
                    <input className="uinput" placeholder="919XXXXXXXXX" value={c.whatsapp_number}
                      onChange={e => updateContact(i, 'whatsapp_number', e.target.value)} />
                  </Field>
                  <Field label="Name">
                    <input className="uinput" value={c.contact_name}
                      onChange={e => updateContact(i, 'contact_name', e.target.value)} />
                  </Field>
                  <Field label="Role">
                    <select className="uinput" value={c.role} onChange={e => updateContact(i, 'role', e.target.value)}>
                      <option value="">Role</option>
                      {ROLES.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </Field>
                  <Field label="Primary">
                    <select className="uinput" value={c.is_primary ? 'yes' : 'no'}
                      onChange={e => updateContact(i, 'is_primary', e.target.value === 'yes')}>
                      <option value="yes">Yes</option><option value="no">No</option>
                    </select>
                  </Field>
                  <div className="removeWrap">
                    {contacts.length > 1 && (
                      <button className="removeBtn" onClick={() => removeContact(i)} aria-label="Remove contact">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="addBtn" onClick={addContact}>+ Add another number</button>

            <div className="footer">
              <button className="saveBtn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save client'} <span className="arrow">→</span>
              </button>
              {message && (
                <p className={message.type === 'ok' ? 'msgOk' : 'msgErr'}>{message.text}</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="fieldLabel">{label}{required && <i className="req">*</i>}</span>
      {children}
    </label>
  )
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="sectionLabel">{children}</h2>
}
