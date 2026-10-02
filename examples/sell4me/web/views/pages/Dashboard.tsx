/**
 * The overview.
 *
 * Answers the five questions in order down the page: what period am I looking
 * at, what needs attention, what happened, what sold, what came in.
 *
 * The deferred props (`summary`, `series`, `top_products`) arrive a moment
 * after the shell. Each renders a skeleton shaped like the thing that is
 * coming, so the layout does not jump when it lands.
 */

import { Deferred, Head, Link, router, usePage, WhenVisible } from '@inertiajs/react'
import { useState } from 'react'
import { date, money, percent, useAuth, useCan } from '@/js/hooks'
import { AreaChart } from '@/views/ui/charts'
import { Tour, type TourStep } from '@/views/ui/Tour'
import {
  Badge,
  Banner,
  Counted,
  Button,
  ButtonLink,
  Empty,
  Panel,
  PanelHeader,
  Skeleton,
  Stat,
  StatRow,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/views/ui/kit'
import { IconCard, IconChart, IconCheck, IconChevronRight, IconInvoice, IconOrders, IconPlus } from '@/views/ui/icons'
import type { AnalyticsSummary, Money, OrderRow, SeriesPoint } from '@/js/types'

type Step = {
  key: string
  title: string
  body: string
  url: string
  complete: boolean
  required: boolean
}

const TOUR_STEPS: TourStep[] = [
  { key: 'switcher', title: 'Your store, always in view', body: "This is where you'll switch stores or check whether you're live — worth knowing before anything else." },
  { key: 'search', title: 'Jump to anything', body: 'Press ⌘K anywhere to search orders, products and customers instantly — faster than clicking through menus.' },
  { key: 'products', title: 'Everything you sell', body: 'Add, edit and organise your catalogue here. You already have your first product waiting.' },
  { key: 'orders', title: 'Every sale lands here', body: 'The moment someone pays, the order shows up in this list — ready to fulfil.' },
  { key: 'discounts', title: 'Your launch code is live', body: 'The discount you created is already active. Share it and watch it get used here.' },
  { key: 'designs', title: 'Turn products into posters', body: 'Pick a template, drop in a product or your discount code, and export something ready to post.' },
  { key: 'checklist', title: 'Almost open for business', body: 'Connect a payout account here — the one step nobody can do for you — and your store can start taking real orders.', side: 'top' },
  { key: 'storefront', title: 'See it as a shopper would', body: 'This opens your actual storefront in a new tab, exactly as customers will see it once you launch.' },
]

type Props = {
  range: { key: string; label: string }
  currency_unsupported?: boolean
  currency?: string
  show_tour?: boolean
  onboarding: {
    steps: Step[]
    completed: number
    total: number
    can_launch: boolean
    is_live: boolean
  }
  attention: {
    unfulfilled: number
    pending_payment: number
    failed_payments: number
    low_stock: number
    flagged: number
  }
  recent_orders: OrderRow[]
  summary?: AnalyticsSummary
  series?: SeriesPoint[]
  top_products?: {
    id: number
    title: string
    revenue: Money
    units: number
    views: number
    conversion_rate: number | null
  }[]
}

const RANGES = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['90d', '90 days'],
  ['ytd', 'Year'],
]

export default function Dashboard({ range, onboarding, attention, recent_orders, currency_unsupported, currency, show_tour }: Props) {
  const auth = useAuth()
  const first = auth.user?.name?.split(' ')[0] ?? ''
  const [tour, setTour] = useState(Boolean(show_tour))

  return (
    <>
      <Head title="Overview" />
      <Tour steps={TOUR_STEPS} active={tour} onDone={() => setTour(false)} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.035em] text-ink">
            Welcome{first ? `, ${first}` : ''}
          </h1>
          <p className="mt-2 text-[16px] text-ink-muted">
            {auth.store?.name} · {onboarding.is_live ? 'your store is live' : 'not live yet'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-surface p-1.5">
          {RANGES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => router.get('/', { range: key }, { preserveState: true, preserveScroll: true })}
              className={
                'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ' +
                (range.key === key ? 'bg-ink text-surface' : 'text-ink-muted hover:text-ink')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {currency_unsupported && (
        <div className="mb-4">
          <Banner tone="critical" title={`Checkout is off: ${currency} isn't supported by Paystack`}
            action={<Link href="/settings" className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface">Change currency</Link>}>
            Shoppers see &ldquo;we can&rsquo;t take payment right now&rdquo; until this store uses NGN, GHS, ZAR or KES.
          </Banner>
        </div>
      )}

      {!onboarding.is_live && (
        <div data-tour="checklist">
          <Onboarding onboarding={onboarding} />
        </div>
      )}

      <Deferred data={['summary', 'series']} fallback={<DeferredHeadline />}>
        <Board attention={attention} recent_orders={recent_orders} />
      </Deferred>
    </>
  )
}

/* ------------------------------------------------------------------ pieces */

function Onboarding({ onboarding }: { onboarding: Props['onboarding'] }) {
  const remaining = onboarding.steps.filter((step) => !step.complete)

  return (
    <Panel className="mb-4" padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">
            Finish setting up
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-soft)]">
            {onboarding.completed} of {onboarding.total} done
            {onboarding.can_launch && ' \u2014 you\u2019re ready to launch.'}
          </p>
        </div>

        {onboarding.can_launch ? (
          <Button tone="primary" size="sm" onClick={() => router.post('/settings/launch')}>
            Launch store
          </Button>
        ) : (
          <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-[var(--color-line)]">
            <div
              className="bg-[var(--color-accent)] transition-[width] duration-500"
              style={{ width: `${(onboarding.completed / onboarding.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="divide-y divide-[var(--color-line-soft)]">
        {(remaining.length > 0 ? remaining : onboarding.steps).slice(0, 4).map((step) => (
          <Link
            key={step.key}
            href={step.url}
            className="row-hover flex items-center gap-3 px-4 py-2.5 transition-colors"
          >
            <span
              className={
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ' +
                (step.complete
                  ? 'border-transparent bg-[var(--color-positive)] text-white'
                  : 'border-[var(--color-line)]')
              }
            >
              {step.complete && <IconCheck className="h-2.5 w-2.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-[var(--color-ink)]">
                {step.title}
                {!step.required && (
                  <span className="ml-1.5 text-[11.5px] font-normal text-[var(--color-ink-faint)]">
                    optional
                  </span>
                )}
              </span>
              <span className="block truncate text-[12px] text-[var(--color-ink-soft)]">
                {step.body}
              </span>
            </span>
            <IconChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-faint)]" />
          </Link>
        ))}
      </div>
    </Panel>
  )
}

function AttentionCard({ attention }: { attention: Props['attention'] }) {
  const items = [
    { label: 'to fulfil', value: attention.unfulfilled, href: '/orders?tab=paid' },
    { label: 'awaiting payment', value: attention.pending_payment, href: '/orders?tab=pending' },
    { label: 'failed payments', value: attention.failed_payments, href: '/payments/transactions?status=failed' },
    { label: 'low on stock', value: attention.low_stock, href: '/inventory?view=low' },
    { label: 'flagged for review', value: attention.flagged, href: '/orders' },
  ].filter((item) => item.value > 0)

  return (
    <div className="pastel rise flex flex-col rounded-[var(--radius)] p-6" style={{ background: 'var(--color-clay)', ['--i' as string]: 7 } as React.CSSProperties}>
      <h2 className="text-[18px] font-bold tracking-[-0.02em]">Needs attention</h2>
      {items.length === 0 ? (
        <div className="mt-5 flex flex-1 items-center rounded-2xl bg-[var(--color-surface)] p-5">
          <p className="text-[15px] font-semibold leading-snug">
            You&rsquo;re all caught up. Nothing needs your attention right now.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--color-line)]">
          {items.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="flex items-baseline justify-between gap-3 py-3 hover:opacity-70">
                <span className="text-[15px] font-medium">{item.label}</span>
                <span className="text-[26px] font-bold leading-none tracking-[-0.03em] tabular"><Counted text={String(item.value)} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DeferredHeadline() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="surface p-6">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton mt-6 h-9 w-40" />
          <div className="skeleton mt-4 h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

/**
 * The board. Rendered inside `<Deferred>`, so `summary` and `series` have
 * arrived; still read defensively in case a partial reload asked for one.
 *
 * Four stat cards down the left, the revenue chart on a sage card, best sellers
 * on a taupe one, the recent orders table beneath, and what needs attention on
 * clay. The three pastel cards are the only coloured surfaces in the app.
 */
function Board({
  attention,
  recent_orders,
}: {
  attention: Props['attention']
  recent_orders: Props['recent_orders']
}) {
  const { summary, series = [] } = usePage().props as unknown as Props
  const can = useCan()
  if (!summary) return <DeferredHeadline />

  return (
    <div className="space-y-4">
      <StatRow>
        <Stat
          icon={<IconCard className="h-5 w-5" />}
          label="Gross revenue"
          value={money(summary.gross)}
          hint={`${summary.orders} orders`}
        />
        <Stat
          icon={<IconInvoice className="h-5 w-5" />}
          label="Net revenue"
          value={money(summary.net)}
          hint={`after ${money(summary.platform_fees)} fees`}
        />
        <Stat icon={<IconOrders className="h-5 w-5" />} label="Average order" value={money(summary.average_order)} />
        <Stat
          icon={<IconChart className="h-5 w-5" />}
          label="Conversion"
          value={percent(summary.conversion_rate)}
          hint={summary.sessions ? `${summary.sessions} sessions` : 'no sessions yet'}
        />
      </StatRow>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="pastel rise rounded-[var(--radius)] p-6 xl:col-span-2" style={{ background: 'var(--color-sage)', ['--i' as string]: 4 }}>
          <h2 className="text-[18px] font-bold tracking-[-0.02em]">Revenue</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">Net of refunds, by day</p>
          <div className="mt-4">
            <AreaChart
              height={300}
              points={series.map((point) => ({
                label: point.date,
                value: point.revenue_minor,
                display: money(point.revenue),
              }))}
              valueLabel="Revenue"
              emptyTitle="No revenue in this period"
              emptyBody="Sales will appear here as orders are paid."
            />
          </div>
        </div>

        <div className="pastel rise rounded-[var(--radius)] p-6" style={{ background: 'var(--color-taupe)', ['--i' as string]: 5 }}>
          <h2 className="text-[18px] font-bold tracking-[-0.02em]">Best sellers</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">By revenue in this period</p>
          <div className="mt-4">
            <WhenVisible data="top_products" fallback={<Skeleton rows={5} />}>
              <TopProducts />
            </WhenVisible>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="surface rise xl:col-span-2" style={{ ['--i' as string]: 6 } as React.CSSProperties}>
          <PanelHeader
            title="Recent orders"
            action={
              can('orders.read') && (
                <Link
                  href="/orders"
                  className="flex items-center gap-1 rounded-full bg-sunken px-4 py-2 text-[13px] font-semibold text-ink hover:bg-line"
                >
                  All orders <IconChevronRight className="h-3.5 w-3.5" />
                </Link>
              )
            }
          />
          {recent_orders.length === 0 ? (
            <Empty
              title="No orders yet"
              body="Once your store is live and a customer checks out, orders appear here."
              action={
                can('products.create') && (
                  <ButtonLink href="/products/new" size="sm">
                    <IconPlus className="h-3.5 w-3.5" />
                    Add a product
                  </ButtonLink>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto pb-3">
              <table className="w-full border-collapse text-[13px]">
                <THead>
                  <tr>
                    <TH>Order</TH>
                    <TH>Customer</TH>
                    <TH>Status</TH>
                    <TH align="right">Total</TH>
                    <TH align="right">Placed</TH>
                  </tr>
                </THead>
                <TBody>
                  {recent_orders.map((order) => (
                    <TR key={order.id} href={`/orders/${order.id}`}>
                      <TD>
                        <Link href={`/orders/${order.id}`} className="font-semibold text-ink">
                          #{order.number}
                        </Link>
                      </TD>
                      <TD className="max-w-[200px] truncate">{order.customer ?? order.email}</TD>
                      <TD>
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={order.status} />
                          {order.risk_score >= 40 && <Badge tone="caution">Review</Badge>}
                        </div>
                      </TD>
                      <TD align="right">{money(order.total)}</TD>
                      <TD align="right" className="text-ink-muted">
                        {date(order.created_at)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </table>
            </div>
          )}
        </div>

        <AttentionCard attention={attention} />
      </div>
    </div>
  )
}

function TopProducts() {
  const { top_products: products = [] } = usePage().props as unknown as Props

  if (products.length === 0) {
    return <p className="py-6 text-[14px] text-[var(--color-ink-muted)]">Your best sellers will be listed here.</p>
  }

  return (
    <ul className="space-y-1">
      {products.slice(0, 6).map((product, index) => (
        <li key={product.id}>
          <Link href={`/products/${product.id}`} className="flex items-center gap-3 rounded-2xl py-2 hover:opacity-70">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[15px] font-bold tabular">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{product.title}</span>
              <span className="block text-[13px] text-[var(--color-ink-muted)]">{product.units} sold</span>
            </span>
            <span className="shrink-0 text-[14px] font-bold tabular"><Counted text={money(product.revenue)} /></span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
