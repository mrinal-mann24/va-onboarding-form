'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Login failed.')
      setLoading(false)
    }
  }

  return (
    <div className="loginPage">
      <div className="blob blob--a" />
      <div className="blob blob--b" />

      <form className="loginCard" onSubmit={handleLogin}>
        <img src="/logo.png" alt="Virtual Accountant" className="loginLogo" />
        <p className="eyebrow">Virtual Accountant</p>
        <h1 className="loginTitle">VA team sign in</h1>
        <p className="loginHint">Enter the shared passcode to continue.</p>

        <label className="field loginField">
          <span className="fieldLabel">Passcode</span>
          <input
            className="uinput"
            type="password"
            placeholder="••••••••"
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus
          />
        </label>

        <button className="saveBtn" type="submit" disabled={loading || !code}>
          {loading ? 'Signing in…' : 'Sign in'} <span className="arrow">→</span>
        </button>

        {error && <p className="msgErr">{error}</p>}
      </form>
    </div>
  )
}
