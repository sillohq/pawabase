import { Head, Link, router } from '@inertiajs/react'
import { ago } from '@/js/hooks'
import { useChannel } from '@/js/realtime'
import { Badge, Empty, PageHeader, Panel, Tabs } from '@/views/ui/kit'
import { IconCustomerService } from '@/views/ui/icons'

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

const STATUS_TONE = { open: 'critical', answered: 'positive', closed: 'neutral' } as const
const STATUS_LABEL = { open: 'Awaiting reply', answered: 'Answered', closed: 'Closed' } as const

type Props = {
  tickets: Ticket[]
  counts: { open: number; answered: number; closed: number }
  status: string
  store: { help_desk_enabled: boolean }
  realtime?: { channel: string }
}

export default function Index({ tickets, counts, status, store, realtime }: Props) {
  // A ticket arriving or changing anywhere in the store: reload the list quietly. The channel only says "something changed"; the server knows how to answer
  // that correctly (permissions, filters, the tab that is active).
  useChannel(realtime?.channel, () => router.reload({ only: ['tickets', 'counts'] }))

  return (
    <>
      <Head title="Help desk" />
      <PageHeader
        title="Help desk"
        description="Questions shoppers ask from the widget on your storefront."
        actions={
          !store.help_desk_enabled && (
            <Link href="/settings" className="text-[13px] font-medium text-[var(--color-accent)] hover:underline">
              Widget is off — turn it on in Settings
            </Link>
          )
        }
      />

      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'open', label: 'Awaiting reply', count: counts.open },
            { key: 'answered', label: 'Answered', count: counts.answered },
            { key: 'closed', label: 'Closed', count: counts.closed },
          ]}
          active={status}
          onSelect={(key) => router.get('/help-desk', { status: key }, { preserveState: true, replace: true })}
        />
      </div>

      {tickets.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconCustomerService className="h-6 w-6" />}
            title="Nothing here"
            body={
              status === 'open'
                ? 'When a shopper asks a question from the storefront widget, it shows up here.'
                : `No ${status} conversations yet.`
            }
          />
        </div>
      ) : (
        <Panel padded={false}>
          <div className="divide-y divide-[var(--color-line-soft)]">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/help-desk/${ticket.id}`}
                className="flex items-center gap-3.5 px-5 py-4 transition hover:bg-[var(--color-sunken)]"
              >
                <span className={'mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ' +
                  (ticket.status === 'open' ? 'bg-[var(--color-critical)]' : 'bg-transparent')} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium text-[var(--color-ink)]">{ticket.subject}</span>
                    <Badge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
                    {ticket.opt_in_email && <Badge tone="neutral">Emails replies</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-[var(--color-ink-muted)]">
                    {ticket.customer_name} · {ticket.customer_email}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-[var(--color-ink-faint)]">{ago(ticket.last_message_at)}</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </>
  )
}
