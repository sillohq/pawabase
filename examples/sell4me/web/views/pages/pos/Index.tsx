/**
 * The POS hub — `GET /pos`.
 *
 * Answers three questions on one screen: can I sell right now (the launch
 * panel), where does the shift stand (the session card), and what sold
 * recently. Registers get a compact list at the bottom with their launch
 * links and receipt settings.
 */

import { Head, router } from '@inertiajs/react'
import { cx, dateTime, money } from '@/js/hooks'
import type { Money } from '@/js/types'
import {
  IconCard,
  IconChevronRight,
  IconClock,
} from '@/views/ui/icons'
import {
  Badge,
  Button,
  ButtonLink,
  Empty,
  PageHeader,
  Panel,
  PanelHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/views/ui/kit'

// ---------------------------------------------------------------------------
// Types — mirrored from `_session_prop` / `_order_row` / `_device_prop`
// ---------------------------------------------------------------------------

type OpenSession = {
  id: number
  status: 'open' | 'closed'
  device_label: string | null
  opened_by: string | null
  opening_float: Money
  opened_at: string | null
  closed_at: string | null
  total_sales: Money
  order_count: number
  variance_minor: number | null
}

type RecentOrder = {
  id: number
  number: number
  status: string
  payment_status: string
  total: Money
  customer_name: string
  customer_email: string | null
  placed_at: string | null
}

type Device = {
  id: number
  label: string
  token: string
  pos_domain: string | null
  receipt_header: string | null
  receipt_footer: string | null
  print_receipt_auto: boolean
  is_active: boolean
}

type Props = {
  open_session: OpenSession | null
  recent_orders: RecentOrder[]
  devices: Device[]
}

function paymentTone(payment_status: string): 'ok' | 'critical' | 'neutral' {
  if (payment_status === 'paid') return 'ok'
  if (payment_status === 'failed') return 'critical'
  return 'neutral'
}

function deviceUrl(device: Device): string {
  return device.pos_domain
    ? `https://${device.pos_domain}`
    : `/pos/terminal?device=${device.token}`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PosIndex({ open_session, recent_orders, devices }: Props) {
  return (
    <>
      <Head title="Point of Sale" />

      <PageHeader
        title="Point of Sale"
        description="Sell from the full-screen register, track shifts, and reconcile the drawer at close."
        actions={
          <>
            <Button onClick={() => router.visit('/pos/sessions')}>
              <IconClock className="h-3.5 w-3.5" />
              Sessions
            </Button>
            <ButtonLink href="/pos/terminal" variant="primary">
              <IconCard className="h-3.5 w-3.5" />
              Open POS
            </ButtonLink>
          </>
        }
      />

      {/* ── Launch pad + active session ───────────────────────────────── */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-brand-soft text-brand">
            <IconCard className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">
              Open the register
            </p>
            <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-soft)]">
              Full-screen terminal — product grid, cash and card payments, receipts.
            </p>
          </div>
          <ButtonLink href="/pos/terminal" variant="primary">
            Launch
            <IconChevronRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </Panel>

        <Panel className="flex items-center gap-4">
          <span
            className={cx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)]',
              open_session
                ? 'bg-ok-soft text-ok'
                : 'bg-[var(--color-sunken)] text-[var(--color-ink-faint)]',
            )}
          >
            <IconClock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">
              {open_session ? 'Session in progress' : 'No open session'}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-ink-soft)]">
              {open_session
                ? `Opened ${dateTime(open_session.opened_at)}${
                    open_session.device_label ? ` · ${open_session.device_label}` : ''
                  } — ${open_session.order_count} sales`
                : 'Open a session to track the cash drawer and reconcile at end of day.'}
            </p>
          </div>
          <Button
            onClick={() =>
              router.visit(
                open_session ? `/pos/sessions/${open_session.id}` : '/pos/sessions',
              )
            }
          >
            {open_session ? 'View' : 'Open session'}
          </Button>
        </Panel>
      </div>

      {/* ── Recent POS sales ──────────────────────────────────────────── */}
      <div className="mb-6">
        <Panel padded={false}>
          <PanelHeader
            title="Recent POS sales"
            description={`${recent_orders.length} most recent in-store orders`}
          />
          {recent_orders.length === 0 ? (
            <Empty
              title="No POS sales yet"
              body="Orders taken at the terminal will show up here."
              action={
                <ButtonLink href="/pos/terminal" variant="primary">
                  Open POS
                </ButtonLink>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH align="right">Total</TH>
                  <TH>Time</TH>
                </TR>
              </THead>
              <TBody>
                {recent_orders.map((o) => (
                  <TR key={o.id} href={`/orders/${o.id}`}>
                    <TD>
                      <span className="font-medium text-[var(--color-ink)]">#{o.number}</span>
                    </TD>
                    <TD>{o.customer_name}</TD>
                    <TD>
                      <Badge tone={paymentTone(o.payment_status)}>{o.payment_status}</Badge>
                    </TD>
                    <TD align="right">{money(o.total)}</TD>
                    <TD>{dateTime(o.placed_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>

      {/* ── Registers ─────────────────────────────────────────────────── */}
      <Panel padded={false}>
        <PanelHeader
          title="Registers"
          description="Each device gets its own terminal link."
          action={
            <Button size="sm" onClick={() => router.visit('/pos/config')}>
              Manage
            </Button>
          }
        />
        {devices.length === 0 ? (
          <Empty
            title="No devices yet"
            body="Create a register to give a tablet or till its own terminal link."
            action={
              <Button onClick={() => router.visit('/pos/config')}>Add device</Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Device</TH>
                <TH>Link</TH>
                <TH>Receipt printing</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {devices.map((d) => (
                <TR key={d.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          'inline-flex h-2 w-2 shrink-0 rounded-full',
                          d.is_active ? 'bg-emerald-500' : 'bg-[var(--color-line)]',
                        )}
                      />
                      <span className="text-[13px] font-medium text-[var(--color-ink)]">
                        {d.label}
                      </span>
                      {!d.is_active && <Badge tone="neutral">Inactive</Badge>}
                    </div>
                  </TD>
                  <TD>
                    <a
                      href={deviceUrl(d)}
                      className="font-[family-name:var(--font-mono)] text-[12px] text-brand hover:underline"
                    >
                      {d.pos_domain ?? `/pos/terminal?device=${d.token.slice(0, 12)}…`}
                    </a>
                  </TD>
                  <TD>
                    {d.print_receipt_auto ? (
                      <Badge tone="ok">Auto</Badge>
                    ) : (
                      <Badge tone="neutral">Off</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <ButtonLink href={deviceUrl(d)} size="sm" variant="secondary">
                        Launch
                      </ButtonLink>
                      <Button size="sm" onClick={() => router.visit('/pos/config')}>
                        Edit
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </>
  )
}
