import { Head } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
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
}

function socketUrl(token: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws/help/${token}`
}

export default function HelpTicket({ ticket: initialTicket, messages: initial, theme }: Props) {
  const [ticket, setTicket] = useState(initialTicket)
  const [messages, setMessages] = useState(initial)
  const [connected, setConnected] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (cancelled) return
      const socket = new WebSocket(socketUrl(initialTicket.token))
      socketRef.current = socket
      socket.onopen = () => setConnected(true)
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'ready') {
          setTicket(data.ticket)
          setMessages(data.messages)
        } else if (data.type === 'message') {
          setTicket(data.ticket)
          setMessages((prev) => [...prev, data.message])
        } else if (data.type === 'ticket.updated') {
          setTicket(data.ticket)
        }
      }
      socket.onclose = () => {
        setConnected(false)
        socketRef.current = null
        if (!cancelled) retry = setTimeout(connect, 2000)
      }
    }

    connect()
    return () => {
      cancelled = true
      if (retry) clearTimeout(retry)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [initialTicket.token])

  function send(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError('Reconnecting — try again in a moment.')
      return
    }
    socket.send(JSON.stringify({ message: body }))
    setDraft('')
    setError(null)
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
