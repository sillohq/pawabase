/**
 * ⌘K — jump to anything.
 *
 * Two halves. Above the fold, static destinations filtered as you type — a
 * merchant who wants the discounts screen should not have to wait on a network
 * round trip to get there. Below, live results from `/search`, which queries
 * orders, products, customers, transactions and campaigns in one go.
 *
 * The live half is debounced and fetched as an Inertia *partial* reload of the
 * search page's `results` prop, so it reuses the same endpoint the full search
 * page uses. One implementation, one permission check.
 */

import { router } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cx, useCan, useDebounced } from '@/js/hooks'
import { Badge } from './kit'
import {
  IconCard,
  IconCustomers,
  IconMegaphone,
  IconOrders,
  IconProduct,
  IconSearch,
} from './icons'

type Result = {
  type: string
  id: number
  title: string
  subtitle: string
  url: string
  badge: string | null
}

const DESTINATIONS: { label: string; href: string; group: string; permission?: string }[] = [
  { label: 'Overview', href: '/', group: 'Go to', permission: 'analytics.read' },
  { label: 'Orders', href: '/orders', group: 'Go to', permission: 'orders.read' },
  { label: 'Products', href: '/products', group: 'Go to', permission: 'products.read' },
  { label: 'Inventory', href: '/inventory', group: 'Go to', permission: 'inventory.read' },
  { label: 'Customers', href: '/customers', group: 'Go to', permission: 'customers.read' },
  { label: 'Segments', href: '/customers/segments', group: 'Go to', permission: 'customers.read' },
  { label: 'Abandoned carts', href: '/customers/abandoned', group: 'Go to', permission: 'customers.read' },
  { label: 'Campaigns', href: '/marketing/campaigns', group: 'Go to', permission: 'campaigns.read' },
  { label: 'Discounts', href: '/marketing/discounts', group: 'Go to', permission: 'discounts.read' },
  { label: 'Pages', href: '/storefront/pages', group: 'Go to', permission: 'storefront.read' },
  { label: 'Templates', href: '/storefront/templates', group: 'Go to', permission: 'storefront.read' },
  { label: 'Analytics', href: '/analytics', group: 'Go to', permission: 'analytics.read' },
  { label: 'Finance', href: '/payments', group: 'Go to', permission: 'payments.read' },
  { label: 'Payouts', href: '/payments/payouts', group: 'Go to', permission: 'payouts.read' },
  { label: 'Connect payouts', href: '/payments/payouts/connect', group: 'Go to', permission: 'payments.read' },
  { label: 'API keys & webhooks', href: '/developers', group: 'Go to', permission: 'developers.read' },
  { label: 'Team', href: '/settings/team', group: 'Go to', permission: 'staff.read' },
  { label: 'Audit log', href: '/settings/audit', group: 'Go to', permission: 'settings.read' },
  { label: 'New product', href: '/products/new', group: 'Create', permission: 'products.create' },
  { label: 'Export data', href: '/exports', group: 'Create', permission: 'reports.export' },
]

const TYPE_ICON: Record<string, (props: { className?: string }) => React.ReactNode> = {
  order: IconOrders,
  product: IconProduct,
  customer: IconCustomers,
  transaction: IconCard,
  campaign: IconMegaphone,
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const can = useCan()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const settled = useDebounced(query, 220)

  const destinations = useMemo(() => {
    const allowed = DESTINATIONS.filter((item) => !item.permission || can(item.permission))
    if (!query.trim()) return allowed.slice(0, 6)
    const needle = query.toLowerCase()
    return allowed.filter((item) => item.label.toLowerCase().includes(needle)).slice(0, 6)
  }, [query, can])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setCursor(0)
      // Focus after paint, or the browser gives it back to whatever was focused
      // when the dialog mounted.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open || settled.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    let cancelled = false

    // A partial reload of `/search` — the same endpoint the full page uses, so
    // the palette cannot show a customer the merchant may not see.
    router.reload({
      only: ['results'],
      data: { q: settled },
      // Not a real navigation: the palette must not push a history entry per
      // keystroke.
      replace: true,
      onSuccess: (page) => {
        if (cancelled) return
        const found = (page.props as { results?: Result[] }).results
        setResults(Array.isArray(found) ? found : [])
      },
      onFinish: () => !cancelled && setLoading(false),
    })

    return () => {
      cancelled = true
    }
  }, [settled, open])

  const items = useMemo(
    () => [
      ...destinations.map((d) => ({ kind: 'link' as const, ...d })),
      ...results.map((r) => ({ kind: 'result' as const, ...r })),
    ],
    [destinations, results],
  )

  useEffect(() => setCursor(0), [items.length])

  if (!open) return null

  function go(href: string) {
    onClose()
    router.visit(href)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') return onClose()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((value) => Math.min(value + 1, items.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((value) => Math.max(value - 1, 0))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const item = items[cursor]
      if (item) go(item.kind === 'link' ? item.href : item.url)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="fixed inset-0 bg-[oklch(0.2_0.01_265/0.35)] backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-modal)]"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-3.5">
          <IconSearch className="h-4 w-4 shrink-0 text-[var(--color-ink-faint)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search orders, products, customers…"
            className="h-11 flex-1 bg-transparent text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
          />
          {loading && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" aria-label="Searching" />
          )}
          <kbd className="rounded-[3px] border border-[var(--color-line)] px-1 font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--color-ink-faint)]">
            esc
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-2.5 py-8 text-center text-[13px] text-[var(--color-ink-soft)]">
              {query.trim().length < 2
                ? 'Type at least two characters to search.'
                : `Nothing matching “${query}”.`}
            </p>
          )}

          {destinations.length > 0 && (
            <Group label={destinations[0]!.group}>
              {destinations.map((item, index) => (
                <Row
                  key={item.href}
                  active={cursor === index}
                  onSelect={() => go(item.href)}
                  onHover={() => setCursor(index)}
                  title={item.label}
                  subtitle={item.href}
                />
              ))}
            </Group>
          )}

          {results.length > 0 && (
            <Group label="Results">
              {results.map((result, index) => {
                const Icon = TYPE_ICON[result.type]
                const position = destinations.length + index
                return (
                  <Row
                    key={`${result.type}-${result.id}`}
                    active={cursor === position}
                    onSelect={() => go(result.url)}
                    onHover={() => setCursor(position)}
                    icon={Icon ? <Icon className="h-3.5 w-3.5" /> : undefined}
                    title={result.title}
                    subtitle={result.subtitle}
                    badge={result.badge}
                    type={result.type}
                  />
                )
              })}
            </Group>
          )}
        </div>
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="nav-heading px-2.5 py-1.5">{label}</div>
      {children}
    </div>
  )
}

function Row({
  active,
  onSelect,
  onHover,
  title,
  subtitle,
  icon,
  badge,
  type,
}: {
  active: boolean
  onSelect: () => void
  onHover: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: string | null
  type?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseMove={onHover}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left transition-colors',
        active ? 'bg-[var(--color-sunken)]' : 'hover:bg-[var(--color-sunken)]',
      )}
    >
      {icon && <span className="shrink-0 text-[var(--color-ink-faint)]">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-[var(--color-ink)]">{title}</span>
        {subtitle && (
          <span className="block truncate text-[11.5px] text-[var(--color-ink-faint)]">
            {subtitle}
          </span>
        )}
      </span>
      {badge && <Badge>{badge.replace(/_/g, ' ')}</Badge>}
      {type && (
        <span className="shrink-0 text-[11px] uppercase tracking-[0.04em] text-[var(--color-ink-faint)]">
          {type}
        </span>
      )}
    </button>
  )
}
