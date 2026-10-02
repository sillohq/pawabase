/**
 * The dashboard shell: a compact sidebar, a thin top bar, and the page.
 *
 * The navigation is grouped exactly as the platform's information architecture
 * is — Sales, Catalog, Customers, Marketing, Store, Analytics, Payments,
 * Developers, Settings — and every item is filtered by permission, so a support
 * agent's sidebar is genuinely shorter rather than full of things that will
 * refuse them.
 *
 * That filtering is *cosmetic*. The gate that refuses an action lives on the
 * route; this only avoids showing a door that will not open.
 */

import { Link, router, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { cx, useAuth, useCan, useShared, useShortcut, useTheme } from '@/js/hooks'
import { CommandPalette } from '@/views/ui/CommandPalette'
import { FlashMessages } from '@/views/ui/FlashMessages'
import { LogoMark } from '@/views/ui/Logo'
import { Badge, MenuItem, Popover } from '@/views/ui/kit'
import {
  IconBell,
  IconCard,
  IconChart,
  IconChevronDown,
  IconCode,
  IconColors,
  IconCustomers,
  IconExternal,
  IconFile,
  IconHome,
  IconInventory,
  IconInvoice,
  IconLayout,
  IconDownload,
  IconLogout,
  IconCustomerService,
  IconMegaphone,
  IconMoon,
  IconOrders,
  IconProduct,
  IconRefund,
  IconSearch,
  IconSettings,
  IconStore,
  IconSun,
  IconTag,
  IconTruck,
  IconUser,
} from '@/views/ui/icons'

//: Which nav links the dashboard tour points at, keyed by href. Anything not
//: listed here just gets no `data-tour` attribute — most links don't need one.
const TOUR_HREFS: Record<string, string> = {
  '/products': 'products',
  '/orders': 'orders',
  '/designs': 'designs',
  '/marketing/discounts': 'discounts',
}

type NavItem = {
  label: string
  href: string
  icon?: (props: { className?: string }) => ReactNode
  permission?: string
  /** Match on prefix rather than equality — `/orders/1042` should light
   *  `Orders`. Exact-only matching leaves the sidebar blank on every detail
   *  page, which is exactly where a reader most wants to know where they are. */
  exact?: boolean
}

type NavGroup = {
  heading?: string
  /** Drawn beside the heading. A group is a thing, not a word. */
  icon?: (props: { className?: string }) => ReactNode
  items: NavItem[]
}

/**
 * Five groups, not ten.
 *
 * The earlier version had a heading for every noun in the product — Sales,
 * Catalog, Customers, Marketing, Store, Analytics, Payments, Developers,
 * Settings — which is an accurate description of the software and a bad
 * sidebar. Ten headings is not navigation; it is a table of contents, and a
 * reader scans it every time instead of learning it.
 *
 * These five are the questions a merchant actually arrives with: what sold,
 * what am I selling, what does the shop look like, how do I get more of it,
 * where is the money. Everything else is Settings.
 */
const NAVIGATION: NavGroup[] = [
  {
    items: [{ label: 'Overview', href: '/', icon: IconHome, exact: true, permission: 'analytics.read' }],
  },
  {
    heading: 'Sell',
    icon: IconOrders,
    items: [
{ label: 'Orders', href: '/orders', icon: IconOrders, permission: 'orders.read' },
  { label: 'Point of Sale', href: '/pos', icon: IconCard, permission: 'pos.read' },
  { label: 'Products', href: '/products', icon: IconProduct, permission: 'products.read' },
      { label: 'Collections', href: '/collections', icon: IconTag, permission: 'products.read' },
      { label: 'Inventory', href: '/inventory', icon: IconInventory, permission: 'inventory.read' },
      { label: 'Customers', href: '/customers', icon: IconCustomers, exact: true, permission: 'customers.read' },
      { label: 'Help desk', href: '/help-desk', icon: IconCustomerService, permission: 'support.read' },
    ],
  },
  {
    heading: 'Grow',
    icon: IconChart,
    items: [
      { label: 'Analytics', href: '/analytics', icon: IconChart, permission: 'analytics.read' },
      { label: 'Campaigns', href: '/marketing/campaigns', icon: IconMegaphone, permission: 'campaigns.read' },
      { label: 'Designs', href: '/designs', icon: IconTag, permission: 'campaigns.read' },
      { label: 'Discounts', href: '/marketing/discounts', icon: IconTag, permission: 'discounts.read' },
      { label: 'Segments', href: '/customers/segments', icon: IconCustomers, permission: 'customers.read' },
      { label: 'Abandoned carts', href: '/customers/abandoned', icon: IconOrders, permission: 'customers.read' },
    ],
  },
  {
    heading: 'Money',
    icon: IconCard,
    items: [
      { label: 'Finance', href: '/payments', icon: IconCard, exact: true, permission: 'payments.read' },
      { label: 'Transactions', href: '/payments/transactions', icon: IconCard, permission: 'payments.read' },
      { label: 'Payouts', href: '/payments/payouts', icon: IconCard, permission: 'payouts.read' },
      { label: 'Refunds', href: '/payments/refunds', icon: IconRefund, permission: 'payments.read' },
      { label: 'Fees', href: '/payments/fees', icon: IconInvoice, permission: 'payments.read' },
    ],
  },
  {
    heading: 'Settings',
    icon: IconSettings,
    items: [
      { label: 'General', href: '/settings', icon: IconSettings, exact: true, permission: 'settings.read' },
      { label: 'Shipping', href: '/settings/shipping', icon: IconTruck, permission: 'settings.read' },
      { label: 'Team', href: '/settings/team', icon: IconCustomers, permission: 'staff.read' },
      { label: 'Roles', href: '/settings/roles', icon: IconSettings, permission: 'staff.read' },
      { label: 'Developers', href: '/developers', icon: IconCode, permission: 'developers.read' },
      { label: 'Audit log', href: '/settings/audit', icon: IconFile, permission: 'settings.read' },
    ],
  },
  {
    heading: 'Store',
    icon: IconStore,
    items: [
      { label: 'Pages', href: '/storefront/pages', icon: IconLayout, permission: 'storefront.read' },
      { label: 'Templates', href: '/storefront/templates', icon: IconColors, permission: 'storefront.read' },
      { label: 'Domains', href: '/storefront/domains', icon: IconExternal, permission: 'settings.read' },
      { label: 'SEO', href: '/storefront/seo', icon: IconSearch, permission: 'storefront.read' },
    ],
  },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const { url } = usePage()
  const shared = useShared()
  const can = useCan()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  useShortcut('k', () => setPaletteOpen(true))

  // The mobile drawer must close on navigation, or a tap on a link leaves the
  // reader on the new page with the menu still covering it.
  useEffect(() => setMobileNav(false), [url])

  const path = url.split('?')[0] ?? '/'

  function isActive(item: NavItem): boolean {
    if (item.exact) return path === item.href
    return path === item.href || path.startsWith(`${item.href}/`)
  }

  const groups = NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0)

  const [theme, setTheme] = useTheme()
  const dark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    // The frame is the outermost colour; the sidebar and the main panel are two
    // cards on it, and all three follow the theme.
    <div className="app-shell min-h-screen p-3 lg:p-4" style={{ background: 'var(--color-frame)' }}>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div className="mx-auto flex max-w-[1920px] gap-4 lg:h-[calc(100vh-2rem)]">
        {mobileNav && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-hidden
          />
        )}

        <aside
          className={cx(
            'w-[290px] shrink-0 flex-col overflow-y-auto rounded-[32px] bg-[var(--color-surface)] p-5 text-[var(--color-ink)]',
            mobileNav ? 'fixed inset-y-3 left-3 z-40 flex' : 'hidden',
            'lg:static lg:flex',
          )}
        >
          <Link href="/" className="flex items-center gap-3 px-2 pb-5 pt-2 text-[var(--color-ink)]">
            <LogoMark className="h-8 w-8" />
            <span className="text-[24px] font-bold tracking-[-0.03em]">{shared.app.name}</span>
          </Link>

          <StoreSwitcher />

          <nav className="flex-1 pb-4">
            {groups.map((group, index) => (
              <div key={group.heading ?? index}>
                {group.heading && (
                  <p className="nav-heading">
                    <span>{group.heading}</span>
                  </p>
                )}
                <div className="nav-group">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} className="nav-link" data-active={isActive(item)} data-tour={TOUR_HREFS[item.href]}>
                      {item.icon && <item.icon className="h-[22px] w-[22px] shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <StorefrontLink />

          {can('pos.create') && (
            <div className="mt-3 rounded-3xl p-5 text-[#141414]" style={{ background: 'var(--color-sage)' }}>
              <p className="text-[15px] font-semibold leading-snug">Selling in person? Ring it up at the register.</p>
              <Link
                href="/pos/terminal"
                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-[#141414] text-[13px] font-semibold text-white"
              >
                <IconCard className="h-4 w-4" />
                Open POS terminal
              </Link>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto rounded-[36px] bg-[var(--color-canvas)] text-[var(--color-ink)]">
          <header className="sticky top-0 z-20 flex items-center gap-3 bg-[var(--color-canvas)] px-5 py-5 sm:px-8">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-ink)] lg:hidden"
              aria-label="Open navigation"
            >
              <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              data-tour="search"
              className="flex h-14 max-w-xl flex-1 items-center gap-3 rounded-2xl bg-[var(--color-surface)] px-5 text-[15px] text-[var(--color-ink-faint)] transition hover:text-[var(--color-ink-muted)]"
            >
              <IconSearch className="h-5 w-5" />
              <span className="flex-1 text-left">Search orders, products, customers…</span>
              <kbd className="hidden rounded-lg bg-[var(--color-sunken)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] sm:inline">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(dark ? 'light' : 'dark')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink)] transition hover:bg-[var(--color-surface)]"
                aria-label={dark ? 'Switch to light' : 'Switch to dark'}
              >
                {dark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
              </button>
              <span className="mx-1 hidden h-7 w-px bg-[var(--color-line)] sm:block" aria-hidden />
              <Link
                href="/notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-ink)] transition hover:bg-[var(--color-surface)]"
                aria-label={`Notifications${shared.notifications.unread ? `, ${shared.notifications.unread} unread` : ''}`}
              >
                <IconBell className="h-5 w-5" />
                {shared.notifications.unread > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--color-critical)]" />
                )}
              </Link>
              <ProfileMenu />
            </div>
          </header>

          <main className="px-5 pb-8 sm:px-8">
            <FlashMessages />
            <div className="mx-auto max-w-[1500px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

function StoreSwitcher() {
  const auth = useAuth()
  const store = auth.store
  // Narrowed into a local: TypeScript loses `auth.store`'s non-null narrowing
  // inside the render callbacks below, which are separate function bodies.
  if (!store) return null

  return (
    <div className="mb-2">
      <Popover
        align="left"
        className="w-56"
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            data-tour="switcher"
            className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-sunken)] px-3 py-3 text-left transition-colors hover:bg-[var(--color-line)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-ink)] text-[14px] font-bold text-[var(--color-surface)]">
              {store.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold text-[var(--color-ink)]">
                {store.name}
              </span>
              <span className="block truncate text-[11px] text-[var(--color-ink-faint)]">
                {store.status === 'active' ? 'Live' : 'Not launched'} · {auth.role}
              </span>
            </span>
            <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-faint)]" />
          </button>
        )}
      >
        {({ close }) => (
          <>
            <MenuItem href="/settings">Store settings</MenuItem>
            <MenuItem href="/settings/team">Team</MenuItem>
            <MenuItem
              onClick={() => {
                close()
                router.visit('/onboarding')
              }}
            >
              Switch store
            </MenuItem>
          </>
        )}
      </Popover>
    </div>
  )
}

function StorefrontLink() {
  const auth = useAuth()
  const store = auth.store
  if (!store) return null

  return (
    <div className="pt-2">
      <a
        href={store.storefront_url}
        target="_blank"
        rel="noreferrer"
        className="nav-link"
        data-tour="storefront"
      >
        <IconExternal className="h-[22px] w-[22px]" />
        <span className="flex-1 truncate">View storefront</span>
        {store.status !== 'active' && <Badge tone="caution">Draft</Badge>}
      </a>
    </div>
  )
}

function ProfileMenu() {
  const auth = useAuth()
  const [theme, setTheme] = useTheme()

  const name = auth.user?.name ?? ''
  const email = auth.user?.email ?? ''

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return (
    <Popover
      className="w-64"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="ml-1 flex h-12 cursor-pointer items-center gap-3 rounded-full pl-1 pr-3 text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)]"
          aria-label="Account menu"
        >
          {/* Avatar */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-clay)] text-[13px] font-bold text-[#141414]">
            {initials}
          </span>
          {/* Full name */}
          <span className="max-w-[140px] truncate text-[16px] font-semibold">
            {name}
          </span>
          <IconChevronDown className="h-3 w-3 shrink-0 text-[var(--color-ink-faint)]" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="flex flex-col">
          {/* Identity header */}
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">
                {name}
              </p>
              <p className="truncate text-[11.5px] text-[var(--color-ink-faint)]">
                {email}
              </p>
            </div>
          </div>

          <div className="mx-1.5 border-t border-[var(--color-line)]" />

          {/* Account actions */}
          <div className="p-1.5">
            <MenuItem href="/exports" onClick={close}>
              <IconDownload className="h-3.5 w-3.5 shrink-0" />
              Exports
            </MenuItem>
            <MenuItem href="/settings" onClick={close}>
              <IconUser className="h-3.5 w-3.5 shrink-0" />
              Account settings
            </MenuItem>
          </div>

          <div className="mx-1.5 border-t border-[var(--color-line)]" />

          {/* Appearance */}
          <div className="p-1.5">
            <p className="px-2 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-faint)]">
              Appearance
            </p>
            <div className="flex gap-1">
              {([
                { value: 'light', icon: IconSun, label: 'Light' },
                { value: 'dark', icon: IconMoon, label: 'Dark' },
                { value: 'system', label: 'System' },
              ] as const).map(
                ({
                  value,
                  icon: Icon,
                  label,
                }: {
                  value: 'light' | 'dark' | 'system'
                  icon?: (props: { className?: string }) => ReactNode
                  label: string
                }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cx(
                    'flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-xs)] border py-1.5 text-[11.5px] font-medium transition-colors',
                    theme === value
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-sunken)]',
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-1.5 border-t border-[var(--color-line)]" />

          {/* Sign out */}
          <div className="p-1.5">
            <MenuItem tone="danger" onClick={() => { close(); router.post('/logout') }}>
              <IconLogout className="h-3.5 w-3.5 shrink-0" />
              Sign out
            </MenuItem>
          </div>
        </div>
      )}
    </Popover>
  )
}
