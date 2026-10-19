'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'

/**
 * The student's login password for the admin: the saved copy (shown as is)
 * and «Задать новый пароль», which changes the login right away, no email.
 * Accounts that registered themselves or were created before 2026-10-19 have
 * no saved copy until a new password is set here.
 */
export default function AccountPassword({ studentId, email }: { studentId: string; email: string }) {
  const [saved, setSaved] = useState<{ password: string | null; updatedAt: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'login' | 'password' | null>(null)

  useEffect(() => {
    setSaved(null)
    setError(null)
    setEditing(false)
    fetch(`/api/admin/students/${studentId}/password`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (!r.ok) throw new Error(body?.error ?? 'Не удалось загрузить пароль')
        setSaved(body)
      })
      .catch((e: Error) => setError(e.message))
  }, [studentId])

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/students/${studentId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: draft }),
      })
      const body = await r.json().catch(() => null)
      if (!r.ok) throw new Error(body?.error ?? 'Не удалось сменить пароль')
      setSaved(body)
      setEditing(false)
      setDraft('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function copy(what: 'login' | 'password', text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  const field = 'rounded-lg border border-study-lightgray px-3 py-2 text-sm'
  const copyBtn = (what: 'login' | 'password', text: string) => (
    <button onClick={() => copy(what, text)} className="w-8 h-8 rounded-lg hover:bg-study-card flex items-center justify-center text-study-gray hover:text-study-dark shrink-0" title="Копировать">
      {copied === what ? <Check className="w-4 h-4 text-study-green" /> : <Copy className="w-4 h-4" />}
    </button>
  )

  return (
    <div className="rounded-xl border border-study-lightgray bg-study-bg p-3 sm:p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-study-brown" />
        <p className="text-sm font-bold text-study-dark">Вход в аккаунт</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-study-card px-3 py-1.5 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-study-gray">Логин</p>
            <p className="text-sm font-semibold text-study-dark truncate">{email}</p>
          </div>
          {copyBtn('login', email)}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-study-card px-3 py-1.5 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-study-gray">Пароль</p>
            {saved === null && !error ? (
              <p className="text-sm text-study-gray">Загрузка…</p>
            ) : saved?.password ? (
              <p className="text-sm font-semibold text-study-dark break-all">{saved.password}</p>
            ) : (
              <p className="text-sm text-study-gray">Не сохранён: задайте новый</p>
            )}
          </div>
          {saved?.password && copyBtn('password', saved.password)}
        </div>
      </div>

      {saved?.updatedAt && (
        <p className="text-[11px] text-study-gray">Сохранён {new Date(saved.updatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</p>
      )}

      {editing ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className={`${field} flex-1`}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Новый пароль (мин. 6 символов)"
            autoComplete="new-password"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy || draft.length < 6}
              className="rounded-lg bg-study-green text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              Сохранить
            </button>
            <button onClick={() => { setEditing(false); setDraft('') }} className="rounded-lg text-sm font-semibold px-3 py-2 text-study-gray">
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg bg-study-card border border-study-lightgray text-sm font-semibold px-3 py-2 text-study-dark hover:border-study-brown"
        >
          Задать новый пароль
        </button>
      )}
      {editing && <p className="text-[11px] text-study-gray">Старый пароль перестанет работать сразу. Письмо ученику не отправляется: сообщите новый пароль сами.</p>}
      {error && <p className="text-sm font-semibold text-study-red">{error}</p>}
    </div>
  )
}
