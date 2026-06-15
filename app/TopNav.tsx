'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="topbar">
      <div className="brand">
        <img src="/logo.png" alt="Virtual Accountant" className="logo" />
        <span className="wordmark">Virtual Accountant</span>
      </div>

      <nav className="nav">
        <Link href="/" className={pathname === '/' ? 'navlink active' : 'navlink'}>
          Add client
        </Link>
        <Link href="/clients" className={pathname === '/clients' ? 'navlink active' : 'navlink'}>
          View clients
        </Link>
        <button className="navBtn" onClick={logout}>Log out</button>
      </nav>
    </header>
  )
}
