import { NextResponse } from 'next/server'
import { appendRows, replaceClientRows, isSheetConfigured, type SheetRow } from '@/lib/googleSheet'

// Mirrors a saved client (and its contacts) into the Google Sheet / Excel.
// Protected by proxy.ts (requires the va_auth cookie).
//
// Body: { mode: 'create' | 'update', client_id, client, contacts }
//
// Behaviour:
//   - Sheet not configured  -> 200 { skipped: true }  (saves keep working today)
//   - create -> append rows
//   - update -> delete this client's old rows (matched by client_id in col A), re-append
//   - configured + error    -> 500 (caller treats as a hard failure)

type Contact = {
  whatsapp_number?: string
  contact_name?: string
  role?: string
  is_primary?: boolean
}

type Client = {
  client_name?: string
  legal_name?: string
  gstin?: string
  pan?: string
  entity_type?: string
  industry?: string
  city?: string
  state?: string
  onboarding_date?: string | null
  status?: string
  assigned_va?: string
  email?: string | null
  hubspot_deal_id?: string | null
  deal_stage?: string | null
  amount_paid?: number | null
  ot_amount?: number | null
  ot_payment_date?: string | null
}

function buildRows(clientId: string, client: Client, contacts: Contact[]): SheetRow[] {
  // client_id is column A — it's how an edit finds the rows to overwrite.
  const base = [
    clientId,
    new Date().toISOString(),
    client.client_name ?? '',
    client.legal_name ?? '',
    client.gstin ?? '',
    client.pan ?? '',
    client.entity_type ?? '',
    client.industry ?? '',
    client.city ?? '',
    client.state ?? '',
    client.onboarding_date ?? '',
    client.status ?? '',
    client.assigned_va ?? '',
    client.email ?? '',
    client.hubspot_deal_id ?? '',
    client.deal_stage ?? '',
    client.amount_paid ?? '',
    client.ot_amount ?? '',
    client.ot_payment_date ?? '',
  ]
  const withContacts = contacts.filter(c => c.whatsapp_number)
  return withContacts.length > 0
    ? withContacts.map(c => [
        ...base,
        c.whatsapp_number ?? '',
        c.contact_name ?? '',
        c.role ?? '',
        c.is_primary ? 'Yes' : 'No',
      ])
    : [[...base, '', '', '', '']]
}

export async function POST(request: Request) {
  if (!isSheetConfigured()) {
    return NextResponse.json({ skipped: true })
  }

  let body: { mode?: 'create' | 'update'; client_id?: string; client?: Client; contacts?: Contact[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const clientId = body.client_id
  if (!clientId) {
    return NextResponse.json({ error: 'Missing client_id.' }, { status: 400 })
  }

  const rows = buildRows(clientId, body.client || {}, body.contacts || [])

  try {
    if (body.mode === 'update') {
      await replaceClientRows(clientId, rows)
    } else {
      await appendRows(rows)
    }
    return NextResponse.json({ ok: true, rows: rows.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sheet error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
