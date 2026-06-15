import { NextResponse } from 'next/server'
import { appendRows, isSheetConfigured, type SheetRow } from '@/lib/googleSheet'

// Mirrors a saved client (and its contacts) into the Google Sheet.
// Protected by proxy.ts (requires the va_auth cookie).
//
// Behaviour:
//   - Sheet not configured  -> 200 { skipped: true }  (saves keep working today)
//   - Sheet configured + ok  -> 200 { ok: true }
//   - Sheet configured + err -> 500 (caller treats as a hard failure)

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
}

export async function POST(request: Request) {
  if (!isSheetConfigured()) {
    return NextResponse.json({ skipped: true })
  }

  let body: { client?: Client; contacts?: Contact[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const client = body.client || {}
  const contacts = (body.contacts || []).filter(c => c.whatsapp_number)

  // Build the base client columns once; repeat them per contact row.
  const base = [
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
  ]

  const rows: SheetRow[] =
    contacts.length > 0
      ? contacts.map(c => [
          ...base,
          c.whatsapp_number ?? '',
          c.contact_name ?? '',
          c.role ?? '',
          c.is_primary ? 'Yes' : 'No',
        ])
      : [[...base, '', '', '', '']]

  try {
    await appendRows(rows)
    return NextResponse.json({ ok: true, rows: rows.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sheet error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
