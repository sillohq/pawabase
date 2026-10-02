/**
 * The shapes the server sends.
 *
 * These mirror what `app/inertia.py` and the route modules actually put in
 * props. They are hand-written rather than generated because the generator
 * would have to be kept running, and a type that silently stops matching is
 * worse than no type.
 */

import type { Page, PageProps } from '@inertiajs/core'
import type { ReactNode } from 'react'

/**
 * Money, as the server formats it.
 *
 * Three fields and the front end uses two: `formatted` for display, `minor`
 * for arithmetic and comparisons. Nothing in the front end formats currency —
 * symbol placement and decimal count are decided once, on the server, where
 * the store's currency is known.
 */
export type Money = {
  minor: number
  currency: string
  formatted: string
}

export type Auth = {
  user: { id: number; name: string; email: string; avatar_url: string | null } | null
  store: {
    id: number
    name: string
    slug: string
    currency: string
    status: string
    storefront_url: string
    onboarding_completed: string[]
  } | null
  role: string | null
  /** The member's permission strings. `["*"]` for an owner. Cosmetic only —
   *  the gate that refuses an action is on the route. */
  permissions: string[]
}

export type Flash = Partial<Record<'success' | 'error' | 'info' | 'warning' | string, string>>

export type SharedProps = {
  auth: Auth
  errors: Record<string, string>
  flash: Flash
  notifications: { unread: number }
  app: {
    name: string
    env: string
    platform_fee: { minor: number; currency: string }
  }
}

export type Pagination = {
  page: number
  per_page: number
  total: number
  pages: number
}

export type OrderStatus =
  | 'pending' | 'paid' | 'processing' | 'shipped'
  | 'delivered' | 'cancelled' | 'refunded' | 'partially_refunded'

export type OrderRow = {
  id: number
  number: number
  email: string
  customer: string | null
  status: OrderStatus
  payment_status: string
  fulfilment_status: string
  total: Money
  refunded: Money
  items: number
  risk_score: number
  source: string
  created_at: string | null
  paid_at: string | null
}

export type ProductRow = {
  id: number
  title: string
  slug: string
  status: 'draft' | 'active' | 'archived'
  summary: string | null
  vendor: string | null
  product_type: string | null
  tags: string[]
  image_url: string | null
  variant_count: number
  price: Money
  price_max: Money | null
  stock: number
  stock_state: 'in_stock' | 'low_stock' | 'out_of_stock' | 'untracked'
  requires_shipping: boolean
  created_at: string | null
}

export type VariantRow = {
  id: number
  title: string
  sku: string | null
  barcode: string | null
  price: Money
  price_minor: number
  compare_at: Money | null
  cost: Money | null
  stock: number
  reserved: number
  available: number | null
  stock_state: ProductRow['stock_state']
  track_inventory: boolean
  allow_backorder: boolean
  low_stock_threshold: number
  weight_grams: number
  is_default: boolean
  options?: string[]
}

export type CustomerRow = {
  id: number
  email: string
  name: string
  phone: string | null
  orders_count: number
  total_spent: Money
  average_order: Money
  first_order_at: string | null
  last_order_at: string | null
  accepts_marketing: boolean
  tags: string[]
  risk_score: number
  created_at: string | null
}

export type SeriesPoint = {
  date: string
  revenue: Money
  revenue_minor: number
  orders: number
  customers: number
  sessions: number
}

export type AnalyticsSummary = {
  gross: Money
  net: Money
  refunded: Money
  provider_fees: Money
  platform_fees: Money
  orders: number
  new_customers: number
  average_order: Money
  payments_succeeded: number
  payments_failed: number
  /** `null` when there is nothing to divide by. A rate of 0 would be a claim
   *  about performance; absence is a statement about data. */
  payment_failure_rate: number | null
  conversion_rate: number | null
  refund_rate: number | null
  sessions: number
}

export type Notification = {
  id: number
  kind: string
  title: string
  body: string | null
  url: string | null
  level: 'info' | 'success' | 'warning' | 'critical'
  read_at: string | null
  created_at: string | null
}

/**
 * A page component that may declare its own chrome.
 *
 * The props are `any` rather than `never` on purpose: each page types its own
 * props at its own definition, and a resolver that has to accept every page
 * cannot know them. Narrowing here makes the type unassignable to Inertia's
 * `ComponentResolver` and buys nothing — the real checking happens where the
 * page destructures its props.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageComponent = React.FunctionComponent<any> & {
  layout?: (page: ReactNode) => ReactNode
}

export type PageModule = { default: PageComponent }

export type InertiaPage<T = PageProps> = Page<T & SharedProps>
