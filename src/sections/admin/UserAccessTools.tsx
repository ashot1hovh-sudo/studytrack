'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, UserPlus } from 'lucide-react'

type Orphan = { id: string; email: string; createdAt: string; name: string }

/**
 * «Пользователи и доступ»: create an account directly (name, email, password)
 * and fix logins that were created in Supabase without a profile. Every
 * account starts as trial; paid access goes through «Оплатил» → PIN on the
 * student's row in the list.
 */
export default function UserAccessTools({ onChanged }: { onChanged: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [orphans, setOrphans] = useState<Orphan[] | null>(null)
  const [orphanNames, setOrphanNames] = useState<Record<string, string>>({})
  const [orphanError, setOrphanError] = useState<string | null>(null)

  const loadOrphans = useCallback(() => {
    fetch('/api/admin/students/orphans', { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (!r.ok) throw new Error(body?.error ?? 'Не удалось проверить аккаунты')
        setOrphans(body.orphans)
        setOrphanNames(Object.fromEntries((body.orphans as Orphan[]).map((o) => [o.id, o.name])))
      })
      .catch((e: Error) => setOrphanError(e.message))
  }, [])

  useEffect(() => {
    loadOrphans()
  }, [loadOrphans])

  async function create() {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/admin/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          access: 'trial',
          program: 'bachelor',
          documents: [],
        }),
      })
      const body = await r.json().catch(() => null)
      if (!r.ok) throw new Error(body?.error ?? 'Не удалось создать пользователя')
      setMsg({ ok: true, text: `Создан пробный аккаунт: ${form.email.trim()}. Отправьте ученику email и пароль. После оплаты нажмите «Оплатил» в его строке.` })
      setForm({ fullName: '', email: '', password: '' })
      onChanged()
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function fixOrphan(o: Orphan) {
    setBusy(true)
    setOrphanError(null)
    try {
      const r = await fetch('/api/admin/students/orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: o.id, fullName: orphanNames[o.id] ?? '', access: 'trial' }),
      })
      const body = await r.json().catch(() => null)
      if (!r.ok) throw new Error(body?.error ?? 'Не удалось создать профиль')
      loadOrphans()
      onChanged()
    } catch (e) {
      setOrphanError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const field = 'rounded-lg border border-study-lightgray px-3 py-2 text-sm'

  return (
    <div className="bg-study-card rounded-xl card-shadow p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-study-dark">Пользователи и доступ</h2>
        <p className="text-sm text-study-gray">Создать аккаунт вручную (например, если не приходит код на почту). Аккаунт создаётся пробным.</p>
      </div>

      {orphans && orphans.length > 0 && (
        <div className="rounded-xl border-2 border-study-orange/40 bg-study-orange/5 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-study-orange shrink-0" />
            <div>
              <p className="text-sm font-semibold text-study-dark">Аккаунты без профиля: {orphans.length}</p>
              <p className="text-xs text-study-gray">Созданы в Supabase напрямую, поэтому не видны в списках и не могут получить доступ. Создайте профиль: он появится в списке как пробный, дальше «Оплатил» → PIN.</p>
            </div>
          </div>
          {orphans.map((o) => (
            <div key={o.id} className="rounded-lg bg-study-card p-2.5 grid sm:grid-cols-[1fr_180px_auto] gap-2 items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-study-dark truncate">{o.email}</p>
                <p className="text-xs text-study-gray">создан {new Date(o.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>
              <input
                className={field}
                value={orphanNames[o.id] ?? ''}
                onChange={(e) => setOrphanNames((m) => ({ ...m, [o.id]: e.target.value }))}
                placeholder="Имя ученика"
              />
              <button
                disabled={busy}
                onClick={() => fixOrphan(o)}
                className="rounded-lg bg-study-brown text-white text-xs font-semibold px-3 py-2 disabled:opacity-50"
              >
                Создать профиль
              </button>
            </div>
          ))}
        </div>
      )}
      {orphanError && <p className="text-sm text-study-red">{orphanError}</p>}

      <div className="grid md:grid-cols-2 gap-2">
        <input className={field} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Имя ученика" />
        <input className={field} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email (логин)" />
        <input className={`${field} md:col-span-2`} type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Пароль (мин. 6 символов)" autoComplete="new-password" />
        <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-study-gray">Email подтверждается автоматически, код на почту не нужен.</p>
          <button
            onClick={create}
            disabled={busy || !form.fullName.trim() || !form.email.trim() || form.password.length < 6}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-study-brown text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" /> Создать пользователя
          </button>
        </div>
        {msg && <p className={`md:col-span-2 text-sm font-semibold ${msg.ok ? 'text-study-green' : 'text-study-red'}`}>{msg.text}</p>}
      </div>
    </div>
  )
}
