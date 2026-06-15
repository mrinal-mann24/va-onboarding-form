# AI Accountant — VA Automation Project: Full Context

## 1. The Problem We're Solving

AI Accountant (also "AIA" / "Korefi") is an AI bookkeeping platform for Indian SMBs and CA firms. After a client is onboarded, a WhatsApp **group** is created for them with the Virtual Accounting (VA) team. Clients dump all their documents — PDFs, photos, Google Drive links — into these groups. This is messy: nothing is stored systematically, and VAs manually hunt through chats to find files.

**Goal:** A common WhatsApp **bot number**. Clients send their documents (PDF / photo / Drive link) to the bot. The bot identifies which client the sender belongs to, and stores every file in that client's dedicated folder in the company's Google Drive. One folder per client, all files together (no category sub-folders for v1).

## 2. Two Parallel Workstreams

### A) WhatsApp File-Collection Bot (Python / FastAPI)
Receives WhatsApp messages via Infobip, identifies the client by phone number, downloads files, stores them in the client's Google Drive folder, replies with a confirmation.

### B) Client Onboarding Form (Next.js + Supabase)
A web form the VA/finance team uses to add new clients (and their multiple WhatsApp numbers) into a Supabase cloud database — replacing their current Excel sheet. This database is what the bot uses to look up "which client owns this number."

These connect via the shared Supabase database: the form writes clients + numbers; the bot reads them.

---

## 3. WhatsApp Bot — Current State (Python / FastAPI)

### Stack
- **FastAPI** webhook server (Python), run with `uvicorn main:app --reload`
- **ngrok** for local public tunnel (`ngrok http 8000`) — free plan, URL changes on every restart (must re-update in Infobip each time)
- **Infobip** as the WhatsApp provider (free trial, 60 days)
- Windows machine, project folder: `Desktop/va-bot`, virtualenv at `venv`

### Infobip setup (trial)
- Account created, WhatsApp free trial active (60 days, 100 free messages)
- **Base URL:** `qwex9m.api.infobip.com`
- **API key:** ends in `...e2b3` (full key in Infobip portal → Manage API keys; needed for DOWNLOADING media, not for receiving)
- **Shared test sender:** `447860088970` (UK number, "Infobip test sender")
- Verified test phone (acting as a client): `916372161101` (saved as "Va bot" contact)

### How inbound was wired up (IMPORTANT — trial quirks)
- Inbound forwarding configured at: **Channels and Numbers → Numbers → +44 7860 088970 → WhatsApp tab → Inbound configuration → Keywords**
- Keyword: **`AIACCOUNTANT`** → Forwarding action: **Forward to HTTP** → URL: the ngrok webhook URL ending in `/webhook` → Renderer: `MO_OTT_CONTACT`
- ALSO created a Subscription (Developer Tools → Subscriptions Management) for `INBOUND_MESSAGE` on WhatsApp, pointing to the same URL (profile name `va-bot-inbound`).
- **KEY LEARNING — the shared test sender requires:**
  1. The sending number to be verified (it's the signup number).
  2. The number to be "activated/mapped" to the account — done by messaging the keyword; got confirmation "Your phone number has been successfully connected to your Signup AI Accountant Infobip account."
  3. Every test message must **start with the keyword `AIACCOUNTANT`** to route to this account (shared number disambiguation).
  4. There can be a delay; messages sent before forwarding config saves are not forwarded.
- **This keyword + mapping pain is ONLY because it's the shared test sender.** With a dedicated registered number (production), there is NO keyword, NO mapping delay — every message routes straight to the webhook instantly. Code does not change.

### Confirmed working
- Direct POST to webhook returns 200 and prints payload (proved server+tunnel work).
- Real WhatsApp messages now reach the webhook: TEXT, IMAGE, and DOCUMENT all received and parsed.

### Real Infobip inbound payload shapes (verified)
Text message:
```json
{"results":[{"from":"916372161101","to":"447860088970","integrationType":"WHATSAPP","receivedAt":"2026-06-12T08:47:48.000+0000","messageId":"...","message":{"text":"AIACCOUNTANT hello","type":"TEXT"},"contact":{"name":"Mrinal"},"price":{"pricePerMessage":0.0,"currency":"USD"}}],"messageCount":1,"pendingMessageCount":3}
```
Image:
```json
{"results":[{"from":"916372161101","message":{"url":"https://api.infobip.com/whatsapp/1/senders/447860088970/media/<id>","type":"IMAGE"},"contact":{"name":"Mrinal"}}]}
```
Document (PDF) — note `caption` holds the filename:
```json
{"results":[{"from":"916372161101","message":{"url":"https://api.infobip.com/whatsapp/1/senders/447860088970/media/<id>","caption":"13.11.2025.pdf","type":"DOCUMENT"},"contact":{"name":"Mrinal"}}]}
```
- Drive links arrive as plain `TEXT` (e.g. `linkedin.com/in/...`).
- Media download URL is on `api.infobip.com` and requires the API key (Authorization header) to download.
- Media is retained by Infobip for **7 days** only — download immediately on receipt.

### Current `main.py` (Milestone 2 — receiving + parsing, WORKING)
```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhook")
async def webhook(request: Request):
    data = await request.json()
    print("=== Incoming message ===")
    print(data)

    results = data.get("results", [])
    for msg in results:
        sender = msg.get("from")
        message = msg.get("message", {})
        msg_type = message.get("type")

        print(f"From: {sender}")
        print(f"Type: {msg_type}")

        if msg_type == "TEXT":
            print(f"Text: {message.get('text')}")
        elif msg_type in ("DOCUMENT", "IMAGE", "VIDEO", "AUDIO"):
            print(f"Media URL: {message.get('url')}")
            print(f"File name: {message.get('caption')}")

    return {"status": "ok"}
```

### Bot — Remaining milestones (NOT yet built)
- **M3:** Look up sender's number in Supabase `client_contacts` → resolve to client + drive folder.
- **M4:** Download media from Infobip URL using API key (Authorization: `App <API_KEY>`), save locally/temp. Generate filename for images (no caption); use `caption` as filename for documents.
- **M5:** Upload file to the client's Google Drive folder (Google service account; create folder named after client if missing). Drive links: if publicly accessible, download contents and store; if private, save the link + flag for VA follow-up.
- **M6:** Reply via Infobip API ("✅ Received, filed under [client]"). Works within WhatsApp's 24-hr window (client messages first, so window is open).
- **Deploy:** move off laptop/ngrok to a host (Railway/Render) for a permanent URL.

### Production notes
- Needs OWN dedicated WhatsApp sender (a number NOT on regular WhatsApp) — currently no spare number. Register via Infobip "Register Sender" (embedded signup, needs Meta business verification). Removes keyword + delay entirely.
- 24-hour window rule: free-form replies only within 24h of client's message; otherwise needs pre-approved template. Fine for this use case.

---

## 4. Onboarding Form — Current State (Next.js + Supabase)

### Stack
- **Next.js** (App Router, **TypeScript**, Tailwind) — created via `create-next-app` with recommended defaults
- **shadcn/ui** initialized (components added: input, button, select, label, card) — NOTE: the refined version of the form uses plain HTML inputs + custom CSS instead, not shadcn components
- **@supabase/supabase-js** installed
- Project folder: `Desktop/va-onboarding-form`
- Run with `npm run dev` → `http://localhost:3000`

### Supabase
- Project created. Two tables created via SQL.
- Connection config in `lib/supabase.ts` reading from `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key — NOT service role)
- **RLS:** Hit "new row violates row-level security policy" error → fix is to disable RLS for now (internal tool):
  ```sql
  alter table clients disable row level security;
  alter table client_contacts disable row level security;
  ```
  TODO later: add auth (team login) + re-enable RLS with policies before wider rollout.

### Database schema (live in Supabase)
```sql
create table clients (
  client_id uuid primary key default gen_random_uuid(),
  client_name text not null,
  legal_name text,
  gstin text,
  pan text,
  entity_type text,
  industry text,
  city text,
  state text,
  onboarding_date date,
  status text default 'Active',
  assigned_va text,
  drive_folder_id text,
  created_at timestamptz default now()
);

create table client_contacts (
  contact_id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(client_id) on delete cascade,
  whatsapp_number text not null,
  contact_name text,
  role text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create index idx_contacts_number on client_contacts(whatsapp_number);
```

### Design direction (refined UI already built)
- Monochrome / AIA-brand aesthetic matching the logo (sharp geometric "A" with negative-space 4-point star on black).
- Palette: ink `#0a0a0b`, ivory `#fafaf8`, stone `#6b6b6b`, hairline `#e6e4df`, accent `#c8553d` (used only for primary action + required marker).
- Fonts: Instrument Serif (title only) + Inter (everything else).
- Layout: dark header band with logo + "AI Accountant" wordmark → ivory canvas → single white card, sectioned (Business details / Contacts), star-point divider between sections.
- Logo file goes at `public/logo.png`.
- Full code for `app/page.tsx` and `app/globals.css` already provided (refined version). Form supports multiple contacts via "+ Add another number".

### Form fields (final parameters)
Client Details: Client Name (required), Legal Name, GSTIN, PAN, Entity Type (Pvt Ltd/LLP/Proprietorship/Partnership), Industry, City, State, Onboarding Date, Status (Active/Inactive/Paused), Assigned VA (dropdown).
Contacts (multiple rows): WhatsApp Number (with country code, e.g. 919XXXXXXXXX), Contact Person Name, Role (Owner/Accountant/Partner/Staff), Primary (Yes/No).

VA dropdown names (placeholders, edit to real ones): Vishrutha, Harsh, Abhishek, Jeffrey, Eshita, Mehak.

### Save logic
1. Insert into `clients`, return `client_id`.
2. Map `client_id` onto each non-empty contact, insert into `client_contacts`.
(Handles the multiple-numbers-per-client design.)

### Form — Remaining
- **View Clients page** (`/clients`) — list all clients + their numbers (NEXT STEP, not built yet).
- Test a real save end-to-end (was blocked by RLS; fix above).
- Deploy (Vercel/Netlify) + add team access/auth, re-enable RLS with policies.

---

## 5. Key Architectural Learnings (carry forward)
1. The bot's receiving pipeline is fully proven; remaining work is DB lookup → download → Drive upload → reply.
2. Infobip media URLs expire in 7 days — download immediately.
3. Downloading media needs the Infobip API key in the Authorization header.
4. Shared test sender's keyword (`AIACCOUNTANT`) + activation pain is a trial-only artifact; a registered production sender removes it.
5. Multiple numbers per client → two-table design (`clients` + `client_contacts`) is essential.
6. Files stored one-folder-per-client in the COMPANY Google Drive (not the client's). No category subfolders in v1.
7. Drive links: only downloadable if publicly accessible; private links must be flagged for manual VA follow-up.
8. Form uses anon public Supabase key (browser-safe); service role key must never be in frontend.
9. RLS disabled for now; must add auth + policies before wider use.

## 6. Immediate Next Steps
1. (Form) Disable RLS → test a real client save → build `/clients` view page.
2. (Bot) Build M3 (Supabase lookup) → M4 (download via API key) → M5 (Drive upload) → M6 (confirmation reply).
3. Connect the two: bot reads the same Supabase `client_contacts` the form writes to.