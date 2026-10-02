import { Head, router, useForm } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import { ago, date, useShared } from '@/js/hooks'
import { Badge, Button, PageHeader, Panel, Textarea } from '@/views/ui/kit'
import { IconMail } from '@/views/ui/icons'

type Ticket = {
  id: number
  token: string
  subject: string
  status: 'open' | 'answered' | 'closed'
  customer_name: string
  customer_email: string
  opt_in_email: boolean
  created_at: string
  last_message_at: string
}

type Message = {
  id: number
  from_staff: boolean
  body: string
  created_at: string
  author_name: string | null
}

const STATUS_TONE = { open: 'critical', answered: 'positive', closed: 'neutral' } as const
const STATUS_LABEL = { open: 'Awaiting reply', answered: 'Answered', closed: 'Closed' } as const

function socketUrl(ticketId: number): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws/help-desk?ticket=${ticketId}`
}

export default function Show({ ticket, messages }: { ticket: Ticket; messages: Message[] }) {
  const { errors } = useShared()
  const form = useForm({ message: '' })
  const bottomRef = useRef<HTMLDivElement>(null)

  // Messages the server rendered this page with, plus anything that has
  // arrived live since — a shopper's follow-up, most often. Cleared whenever
  // the server sends a fresh `messages` prop (our own reply redirects back to
  // this same page), since that array already contains everything up to then.
  const [live, setLive] = useState<Message[]>([])
  const [status, setStatus] = useState(ticket.status)
  useEffect(() => setLive([]), [messages])
  useEffect(() => setStatus(ticket.status), [ticket.status])

  useEffect(() => {
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | null = null
    let socket: WebSocket | null = null

    function connect() {
      if (cancelled) return
      socket = new WebSocket(socketUrl(ticket.id))
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'message') {
          setLive((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]))
          setStatus(data.ticket.status)
        } else if (data.type === 'ticket.updated' || data.type === 'ticket.created') {
          setStatus(data.ticket.status)
        }
      }
      socket.onclose = () => {
        if (!cancelled) retry = setTimeout(connect, 2000)
      }
    }

    connect()
    return () => {
      cancelled = true
      if (retry) clearTimeout(retry)
      socket?.close()
    }
  }, [ticket.id])

  const thread = [...messages, ...live]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.length])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.data.message.trim()) return
    form.post(`/help-desk/${ticket.id}/reply`, {
      preserveScroll: true,
      onSuccess: () => form.setData('message', ''),
    })
  }

  return (
    <>
      <Head title={ticket.subject} />
      <PageHeader
        breadcrumbs={[{ label: 'Help desk', href: '/help-desk' }]}
        title={ticket.subject}
        description={`${ticket.customer_name} · ${ticket.customer_email}`}
        actions={
          <div className="flex items-center gap-2.5">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            {ticket.opt_in_email && (
              <span className="flex items-center gap-1 text-[12px] text-[var(--color-ink-muted)]">
                <IconMail className="h-3.5 w-3.5" /> Emails replies
              </span>
            )}
            {status !== 'closed' && (
              <Button
                size="sm"
                onClick={() => router.post(`/help-desk/${ticket.id}/close`, {}, { preserveScroll: true })}
              >
                Mark closed
              </Button>
            )}
          </div>
        }
      />

      <Panel padded={false}>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          {thread.map((message) => (
            <div key={message.id} className={'flex ' + (message.from_staff ? 'justify-end' : 'justify-start')}>
              <div
                className={
                  'max-w-[70%] rounded-[var(--radius-md)] px-4 py-2.5 text-[13.5px] leading-relaxed ' +
                  (message.from_staff
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-sunken)] text-[var(--color-ink)]')
                }
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className={'mt-1 text-[11px] ' + (message.from_staff ? 'text-white/70' : 'text-[var(--color-ink-faint)]')}>
                  {message.from_staff ? message.author_name ?? 'Staff' : ticket.customer_name} · {date(message.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {status !== 'closed' ? (
          <form onSubmit={submit} className="flex items-end gap-3 border-t border-[var(--color-line)] p-4">
            <Textarea
              value={form.data.message}
              onChange={(event) => form.setData('message', event.target.value)}
              placeholder="Write a reply…"
              className="min-h-[44px] flex-1"
              invalid={Boolean(errors.message)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit(event)
                }
              }}
            />
            <Button type="submit" tone="primary" loading={form.processing} disabled={!form.data.message.trim()}>
              Send
            </Button>
          </form>
        ) : (
          <p className="border-t border-[var(--color-line)] p-4 text-center text-[12.5px] text-[var(--color-ink-faint)]">
            This conversation is closed. Last activity {ago(ticket.last_message_at)}.
          </p>
        )}
      </Panel>
    </>
  )
}
