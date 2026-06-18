'use client'

import TopNav from './TopNav'
import ClientForm from './ClientForm'
import { createClient } from '@/lib/saveClient'

export default function AddClientPage() {
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
            <ClientForm onSave={createClient} submitLabel="Save client" resetOnSuccess />
          </div>
        </section>
      </main>
    </div>
  )
}
