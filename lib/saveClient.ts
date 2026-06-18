import { supabase } from '@/lib/supabase'
import type { ClientValues, ContactValues } from '@/app/ClientForm'

// Shared save logic for both the Add page and the Edit modal.
// Returns an error message string on failure, or null on success.

function clientPayload(client: ClientValues) {
  return { ...client, onboarding_date: client.onboarding_date || null }
}

async function syncSheet(
  mode: 'create' | 'update',
  clientId: string,
  client: ClientValues,
  contacts: ContactValues[]
): Promise<string | null> {
  // Mirror to Google Sheet / Excel. The route returns { skipped:true } when
  // no creds are configured, so this is a no-op until you set them up.
  try {
    const res = await fetch('/api/save-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, client_id: clientId, client, contacts }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return 'Saved to database, but the sheet/Excel update failed: ' + (data.error || res.statusText)
    }
  } catch {
    return 'Saved to database, but could not reach the sheet/Excel service.'
  }
  return null
}

// ---- CREATE (Add page) ----
export async function createClient(
  client: ClientValues,
  contacts: ContactValues[]
): Promise<string | null> {
  const { data: clientData, error: clientError } = await supabase
    .from('clients').insert([clientPayload(client)]).select().single()
  if (clientError) return clientError.message

  const toInsert = contacts
    .filter(c => c.whatsapp_number)
    .map(c => ({
      client_id: clientData.client_id,
      whatsapp_number: c.whatsapp_number,
      contact_name: c.contact_name,
      role: c.role,
      is_primary: c.is_primary,
    }))

  if (toInsert.length) {
    const { error } = await supabase.from('client_contacts').insert(toInsert)
    if (error) return 'Client saved, but contacts failed: ' + error.message
  }

  return syncSheet('create', clientData.client_id, client, contacts)
}

// ---- UPDATE (Edit modal) ----
// originalContacts = the contacts as loaded into the modal (with contact_id).
// We smart-diff: keep unchanged, update changed, insert new, delete removed.
export async function updateClient(
  clientId: string,
  client: ClientValues,
  contacts: ContactValues[],
  originalContacts: ContactValues[]
): Promise<string | null> {
  const { error: updErr } = await supabase
    .from('clients').update(clientPayload(client)).eq('client_id', clientId)
  if (updErr) return updErr.message

  const current = contacts.filter(c => c.whatsapp_number)

  // 1. Delete contacts that were present originally but are now gone.
  const currentIds = new Set(current.map(c => c.contact_id).filter(Boolean))
  const removedIds = originalContacts
    .map(c => c.contact_id)
    .filter((id): id is string => Boolean(id) && !currentIds.has(id))
  if (removedIds.length) {
    const { error } = await supabase.from('client_contacts').delete().in('contact_id', removedIds)
    if (error) return 'Client updated, but removing contacts failed: ' + error.message
  }

  // 2. Update existing contacts (those with a contact_id).
  for (const c of current.filter(c => c.contact_id)) {
    const { error } = await supabase.from('client_contacts')
      .update({
        whatsapp_number: c.whatsapp_number,
        contact_name: c.contact_name,
        role: c.role,
        is_primary: c.is_primary,
      })
      .eq('contact_id', c.contact_id!)
    if (error) return 'Client updated, but saving a contact failed: ' + error.message
  }

  // 3. Insert new contacts (no contact_id yet).
  const toInsert = current.filter(c => !c.contact_id).map(c => ({
    client_id: clientId,
    whatsapp_number: c.whatsapp_number,
    contact_name: c.contact_name,
    role: c.role,
    is_primary: c.is_primary,
  }))
  if (toInsert.length) {
    const { error } = await supabase.from('client_contacts').insert(toInsert)
    if (error) return 'Client updated, but adding a contact failed: ' + error.message
  }

  return syncSheet('update', clientId, client, contacts)
}
