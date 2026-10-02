/**
 * The storefront's help desk widget — a floating button that opens into a
 * small chat panel. Deliberately not built on `views/ui/kit.tsx`'s `Modal`:
 * that component belongs to the dashboard's own design system, and the
 * storefront's is `--shop-*` custom properties set by the merchant's theme
 * (see `ShopLayout.tsx`). This panel reads those same variables so it looks
 * like part of whichever shop it is dropped into, not like the admin leaking
 * through.
 *
 * A shopper has no account, so "who is this" is a `token` this component
 * mints server-side on the first message and then keeps in `localStorage`,
 * scoped to the store — the same shape as the cart's own token, just kept on
 * the client instead of in a cookie.
 *
 * The conversation is live through `@pawabase/client` (`js/realtime.ts`), not polling: a staff reply reaches this
 * component the instant `app/services/helpdesk.py` publishes it
 * (`app/services/realtime.py`), the same way the shopper's own message
 * reaches the dashboard. Starting a ticket is still a one-shot POST — there
 * is no token yet to open a socket with until the server mints one.
 */

import { useEffect, useRef, useState } from 'react'
import { useChannel } from '@/js/realtime'
import { IconClose, IconCustomerService, IconMail } from '@/views/ui/icons'

type Message = {
  id: number
  from_staff: boolean
  body: string
  created_at: string
}

type Ticket = {
  id: number
  token: string
  subject: string
  status: 'open' | 'answered' | 'closed'
  opt_in_email: boolean
}

type Thread = { ticket: Ticket; messages: Message[]; channel: string }

function storageKey(storeSlug: string) {
  return `helpdesk:${storeSlug}`
}

function readXsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export default function HelpDeskWidget({
  storeSlug,
  greeting,
  accent,
}: {
  storeSlug: string
  greeting: string | null
  accent: string
}) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [unread, setUnread] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [optIn, setOptIn] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // A returning shopper's own conversation, if their browser still has it —
  // resumed the instant the widget mounts, whether or not it is open, so a
  // reply that arrived while they were browsing elsewhere still shows a dot.
  useEffect(() => {
    try {
      setToken(localStorage.getItem(storageKey(storeSlug)))
    } catch {
      // Private browsing or blocked storage — a new conversation still works,
      // it just cannot be resumed after a reload.
    }
  }, [storeSlug])

  // Load the conversation once a token is known (the first render after a reload, or right after the first message).
  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/help/tickets/${token}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setThread(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [token])

  // Staff replies arrive live on the ticket's own channel.
  const connected = useChannel(thread?.channel, (data) => {
    if (data.type === 'message') {
      setThread((prev) =>
        prev && prev.ticket.id === data.ticket.id ? { ...prev, ticket: data.ticket, messages: prev.messages.some((m) => m.id === data.message.id) ? prev.messages : [...prev.messages, data.message] } : prev,
      )
      if (data.message.from_staff) setUnread((was) => was || !open)
    } else if (data.type === 'ticket.updated') {
      setThread((prev) => (prev && prev.ticket.id === data.ticket.id ? { ...prev, ticket: data.ticket } : prev))
    }
  })

  useEffect(() => {
    if (open) {
      setUnread(false)
      bottomRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [open, thread?.messages.length])

  async function startTicket(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.trim() || !email.trim()) return
    setStarting(true)
    setError(null)
    try {
      const response = await fetch('/help/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': readXsrfToken() },
        body: JSON.stringify({
          name: name.trim() || 'A visitor',
          email: email.trim(),
          message: draft.trim(),
          opt_in_email: optIn,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not send that.')
      setThread(data)
      setDraft('')
      setToken(data.ticket.token)
      try {
        localStorage.setItem(storageKey(storeSlug), data.ticket.token)
      } catch {
        /* the conversation still works this session without persistence */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that. Try again.')
    } finally {
      setStarting(false)
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !token) return
    try {
      const response = await fetch(`/help/tickets/${token}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': readXsrfToken() },
        body: JSON.stringify({ message: body }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Could not send that.')
      setThread(data)
      setDraft('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that. Try again.')
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3" style={{ fontFamily: 'inherit' }}>
      {open && (
        <div
          className="flex h-[520px] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5"
          style={{ background: 'var(--shop-bg, #fff)', color: 'var(--shop-text, #111)' }}
        >
          <div
            className="flex items-center justify-between gap-2 px-4 py-3.5"
            style={{ background: accent, color: '#fff' }}
          >
            <p className="flex items-center gap-1.5 text-[14px] font-semibold">
              Help
              {thread && (
                <span
                  className={'h-1.5 w-1.5 rounded-full ' + (connected ? 'bg-white' : 'bg-white/40')}
                  title={connected ? 'Connected' : 'Reconnecting…'}
                />
              )}
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 transition hover:bg-white/15"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3.5">
            {!thread ? (
              <div>
                {greeting && (
                  <p className="mb-3 text-[13px] leading-relaxed" style={{ color: 'var(--shop-muted, #666)' }}>
                    {greeting}
                  </p>
                )}
                <form onSubmit={startTicket} className="space-y-2.5">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                    style={{ borderColor: 'var(--shop-line, #e5e5e5)', background: 'var(--shop-surface, #fafafa)' }}
                  />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                    placeholder="Your email"
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                    style={{ borderColor: 'var(--shop-line, #e5e5e5)', background: 'var(--shop-surface, #fafafa)' }}
                  />
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    required
                    placeholder="What can we help with?"
                    rows={4}
                    className="w-full resize-none rounded-lg border px-3 py-2 text-[13px] outline-none"
                    style={{ borderColor: 'var(--shop-line, #e5e5e5)', background: 'var(--shop-surface, #fafafa)' }}
                  />
                  <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--shop-muted, #666)' }}>
                    <input type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} />
                    <IconMail className="h-3.5 w-3.5" />
                    Email me when someone replies
                  </label>
                  {error && <p className="text-[12px] text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={starting}
                    className="w-full rounded-lg py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                    style={{ background: accent }}
                  >
                    {starting ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-2.5">
                {thread.messages.map((message) => (
                  <div key={message.id} className={'flex ' + (message.from_staff ? 'justify-start' : 'justify-end')}>
                    <div
                      className="max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed"
                      style={
                        message.from_staff
                          ? { background: 'var(--shop-surface, #f2f2f2)', color: 'var(--shop-text, #111)' }
                          : { background: accent, color: '#fff' }
                      }
                    >
                      <p className="whitespace-pre-wrap">{message.body}</p>
                    </div>
                  </div>
                ))}
                {thread.ticket.status === 'closed' && (
                  <p className="text-center text-[12px]" style={{ color: 'var(--shop-muted, #666)' }}>
                    This conversation was marked resolved.
                  </p>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {thread && (
            <form onSubmit={sendReply} className="flex items-end gap-2 border-t px-3 py-3" style={{ borderColor: 'var(--shop-line, #e5e5e5)' }}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Reply…"
                rows={1}
                className="max-h-24 flex-1 resize-none rounded-lg border px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: 'var(--shop-line, #e5e5e5)', background: 'var(--shop-surface, #fafafa)' }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendReply(event)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: accent }}
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close help' : 'Open help'}
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-105"
        style={{ background: accent }}
      >
        {unread && <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}
        {open ? <IconClose className="h-6 w-6" /> : <IconCustomerService className="h-6 w-6" />}
      </button>
    </div>
  )
}
