'use client'

import { useState } from 'react'

export const VA_NAMES = ['Vishrutha', 'Harsh', 'Abhishek', 'Jeffrey', 'Eshita', 'Mehak']
export const ENTITY_TYPES = ['Pvt Ltd', 'LLP', 'Proprietorship', 'Partnership']
export const ROLES = ['Owner', 'Accountant', 'Partner', 'Staff']

export type ContactValues = {
  contact_id?: string // present when editing an existing contact
  whatsapp_number: string
  contact_name: string
  role: string
  is_primary: boolean
}

export type ClientValues = {
  client_name: string
  legal_name: string
  gstin: string
  pan: string
  entity_type: string
  industry: string
  city: string
  state: string
  onboarding_date: string
  status: string
  assigned_va: string
}

export const emptyClient: ClientValues = {
  client_name: '', legal_name: '', gstin: '', pan: '',
  entity_type: '', industry: '', city: '', state: '',
  onboarding_date: '', status: 'Active', assigned_va: '',
}

export const emptyContact = (primary = false): ContactValues => ({
  whatsapp_number: '', contact_name: '', role: '', is_primary: primary,
})

type Props = {
  initialClient?: ClientValues
  initialContacts?: ContactValues[]
  // Returns an error message string on failure, or null on success.
  onSave: (client: ClientValues, contacts: ContactValues[]) => Promise<string | null>
  submitLabel?: string
  // Reset the form back to empty after a successful save (used by the Add page).
  resetOnSuccess?: boolean
  // Optional callback after a successful save (used by the modal to close + refresh).
  onSuccess?: () => void
}

export default function ClientForm({
  initialClient,
  initialContacts,
  onSave,
  submitLabel = 'Save client',
  resetOnSuccess = false,
  onSuccess,
}: Props) {
  const [client, setClient] = useState<ClientValues>(initialClient ?? { ...emptyClient })
  const [contacts, setContacts] = useState<ContactValues[]>(
    initialContacts && initialContacts.length ? initialContacts : [emptyContact(true)]
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function updateClient(field: keyof ClientValues, value: string) {
    setClient({ ...client, [field]: value })
  }
  function updateContact(i: number, field: keyof ContactValues, value: string | boolean) {
    const next = [...contacts]
    next[i] = { ...next[i], [field]: value }
    setContacts(next)
  }
  function addContact() {
    setContacts([...contacts, emptyContact(false)])
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

    const err = await onSave(client, contacts)
    if (err) {
      setMessage({ type: 'err', text: err })
      setSaving(false)
      return
    }

    setMessage({ type: 'ok', text: `${client.client_name} has been saved.` })
    setSaving(false)
    if (resetOnSuccess) {
      setClient({ ...emptyClient })
      setContacts([emptyContact(true)])
    }
    onSuccess?.()
  }

  return (
    <>
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
          <div className="contactRow" key={c.contact_id ?? i}>
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
          {saving ? 'Saving…' : submitLabel} <span className="arrow">→</span>
        </button>
        {message && (
          <p className={message.type === 'ok' ? 'msgOk' : 'msgErr'}>{message.text}</p>
        )}
      </div>
    </>
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
