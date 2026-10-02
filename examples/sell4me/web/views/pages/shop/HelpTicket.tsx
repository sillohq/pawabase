import { Head } from '@inertiajs/react'
import { useState } from 'react'
import { useChannel } from '@/js/realtime'
import { Container, PageTitle, ShopButton } from '@/views/ui/shop'

type Ticket = {
  id: number
  token: string
  subject: string
  status: 'open' | 'answered' | 'closed'
  customer_name: string
}

type Message = { id: number; from_staff: boolean; body: string; created_at: string }

type Props = {
  ticket: Ticket
  messages: Message[]
  theme: { store: { name: string } }
  realtime: { channel: string }
}

function readXsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export default function HelpTicket({ ticket: initialTicket, messages: initial, theme, realtime }: Props) {
  const [ticket, setTicket] = useState(initialTicket)
  const [messages, setMessages] = useState(initial)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  // The ticket's own channel carries the staff's replies (the unguessable token in its name is the capability).
  const connected = useChannel(realtime.channel, (data) => {
    if (data.type === 'message') {
      setTicket(data.ticket)
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]))
    } else if (data.type === 'ticket.updated') {
      setTicket(data.ticket)
    }
  })

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    try {
      const response = await fetch(`/help/tickets/${initialTicket.token}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': readXsrfToken() },
        body: JSON.stringify({ message: body }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Could not send that.')
      setTicket(data.ticket)
      setMessages(data.messages)
      setDraft('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that. Try again.')
    }
  }

  return (
    <>
      <Head title={`${ticket.subject} · ${theme.store.name}`} />
      <PageTitle description={`Started by ${ticket.customer_name}`}>{ticket.subject}</PageTitle>

      <Container className="max-w-2xl py-10">
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className={'flex ' + (message.from_staff ? 'justify-start' : 'justify-end')}>
              <div
                className="max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed"
                style={{
                  borderRadius: 'var(--shop-radius)',
                  background: message.from_staff ? 'var(--shop-surface)' : 'var(--shop-primary)',
                  color: message.from_staff ? 'var(--shop-text)' : 'var(--shop-bg)',
                }}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
            </div>
          ))}
        </div>

        {ticket.status === 'closed' ? (
          <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--shop-muted)' }}>
            This conversation was marked resolved. Ask another question any time.
          </p>
        ) : null}

        <form onSubmit={send} className="mt-6 space-y-2.5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="Write a reply…"
            className="w-full resize-none border px-3.5 py-3 text-[14px] outline-none"
            style={{ borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)', background: 'var(--shop-surface)' }}
          />
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <ShopButton type="submit" disabled={!draft.trim()}>
            Send
          </ShopButton>
          {!connected && <p className="text-[12px]" style={{ color: 'var(--shop-muted)' }}>Reconnecting…</p>}
        </form>
      </Container>
    </>
  )
}
