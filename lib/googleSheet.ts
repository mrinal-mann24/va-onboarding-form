import { JWT } from 'google-auth-library'

// Server-side only. Writes client rows to a Google Sheet using a service account.
// Credentials live in .env (never NEXT_PUBLIC_) and are read at request time.
//
// Row format (column A onward):
//   client_id | timestamp | client_name | legal_name | gstin | pan | entity_type |
//   industry | city | state | onboarding_date | status | assigned_va |
//   whatsapp_number | contact_name | role | primary
// Column A (client_id) is what lets an edit find and overwrite the right rows.

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

const tabName = () => process.env.GOOGLE_SHEETS_TAB || 'Clients'

async function token(): Promise<string> {
  const { token } = await getClient().getAccessToken()
  if (!token) throw new Error('Could not obtain a Google access token.')
  return token
}

function api(path: string): string {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID!
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`
}

async function gfetch(t: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(api(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Google Sheets ${init?.method || 'GET'} failed (${res.status}): ${detail.slice(0, 300)}`)
  }
  return res
}

// Append rows to the end of the tab. Throws on failure.
export async function appendRows(rows: SheetRow[]): Promise<void> {
  const t = await token()
  const range = encodeURIComponent(`${tabName()}!A1`)
  await gfetch(
    t,
    `/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) }
  )
}

// Look up the numeric grid id for the configured tab (needed to delete rows).
async function tabGridId(t: string): Promise<number> {
  const res = await gfetch(t, '?fields=sheets(properties(sheetId,title))')
  const data = await res.json()
  const sheet = (data.sheets || []).find(
    (s: { properties?: { title?: string } }) => s.properties?.title === tabName()
  )
  if (!sheet) throw new Error(`Tab "${tabName()}" not found in the sheet.`)
  return sheet.properties.sheetId as number
}

// Overwrite a client's rows in place: delete every row whose column A == clientId,
// then append the fresh rows. Used on edit. Throws on failure.
export async function replaceClientRows(clientId: string, rows: SheetRow[]): Promise<void> {
  const t = await token()

  // 1. Read column A to find this client's existing rows (0-based indices).
  const res = await gfetch(t, `/values/${encodeURIComponent(`${tabName()}!A:A`)}`)
  const data = await res.json()
  const colA: string[][] = data.values || []
  const matches: number[] = []
  colA.forEach((row, i) => {
    if (row[0] === clientId) matches.push(i)
  })

  // 2. Delete matched rows bottom-up so indices stay valid.
  if (matches.length) {
    const gridId = await tabGridId(t)
    const requests = matches
      .sort((a, b) => b - a)
      .map(i => ({
        deleteDimension: {
          range: { sheetId: gridId, dimension: 'ROWS', startIndex: i, endIndex: i + 1 },
        },
      }))
    await gfetch(t, ':batchUpdate', { method: 'POST', body: JSON.stringify({ requests }) })
  }

  // 3. Append the fresh rows.
  if (rows.length) await appendRows(rows)
}
