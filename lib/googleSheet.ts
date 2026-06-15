import { JWT } from 'google-auth-library'

// Server-side only. Appends client rows to a Google Sheet using a service account.
// Credentials live in .env (never NEXT_PUBLIC_) and are read at request time.

export type SheetRow = (string | number | boolean | null)[]

export function isSheetConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SHEET_ID
  )
}

function getClient(): JWT {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL!
  // .env stores the key with literal "\n"; convert back to real newlines.
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY!.replace(/\\n/g, '\n')
  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// Append one or more rows to the configured tab. Throws on any failure.
export async function appendRows(rows: SheetRow[]): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID!
  const tab = process.env.GOOGLE_SHEETS_TAB || 'Clients'

  const client = getClient()
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Could not obtain a Google access token.')

  const range = encodeURIComponent(`${tab}!A1`)
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Google Sheets append failed (${res.status}): ${detail.slice(0, 300)}`)
  }
}
