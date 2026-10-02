/**
 * The shared interface vocabulary.
 *
 * Calm, warm and rounded: a plum accent for anything interactive, a charcoal
 * filled pill for the primary action, a fixed set of status hues, whisper-thin
 * borders and large soft corners. Pages compose these and rarely reach for raw
 * Tailwind.
 *
 * Three rules the components encode:
 *
 * - **Hairlines separate; shadows float.** Only `Popover` and `Modal` carry a
 *   shadow, because only they are genuinely above the page.
 * - **Colour means a state.** A `Badge` tone maps to something real. Nothing
 *   is coloured to be interesting.
 * - **Empty, loading and error are components, not afterthoughts.** A table
 *   with no rows renders `Empty`, which says what would be here and what to do
 *   about it — never a blank rectangle.
 */

import { Link } from '@inertiajs/react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { cx, useCountUp } from '@/js/hooks'
import { IconClose, IconSearch, IconWarning } from './icons'

const ring = 'ring-focus'

/* -- buttons ------------------------------------------------------------ */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'

const variants: Record<Variant, string> = {
  // The one action a screen most wants: solid ink on the panel.
  primary: 'bg-ink text-surface hover:opacity-90',
  // A filled tile — the "Filter" button in the reference.
  secondary: 'bg-sunken text-ink hover:bg-line',
  subtle: 'bg-sunken text-ink-muted hover:bg-line hover:text-ink',
  ghost: 'text-ink-muted hover:bg-sunken hover:text-ink',
  danger: 'bg-critical-soft text-critical hover:opacity-80',
}

type Size = 'xs' | 'sm' | 'md'

/**
 * The previous prop name for `variant`, and the values it took.
 *
 * Aliased rather than renamed across every page: a compatibility map in one
 * file is cheaper to read — and to remove later — than the same rename spread
 * over forty call sites, and it cannot be half-done.
 */
type LegacyTone = 'primary' | 'default' | 'ghost' | 'danger'

const legacyTone: Record<LegacyTone, Variant> = {
  primary: 'primary',
  default: 'secondary',
  ghost: 'ghost',
  danger: 'danger',
}

const pad = (size: Size) =>
  size === 'xs' ? 'h-8 px-3.5 text-[12px]' : size === 'sm' ? 'h-10 px-5 text-[13px]' : 'h-12 px-6 text-[14px]'

const base =
  `inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition ${ring} ` +
  'disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap'

export function Button({
  variant,
  tone,
  size = 'md',
  className = '',
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  /** The previous name for `variant`. See `legacyTone`. */
  tone?: LegacyTone
  size?: Size
  loading?: boolean
}) {
  const resolved: Variant = variant ?? (tone ? legacyTone[tone] : 'secondary')
  return (
    <button
      type="button"
      className={cx(base, pad(size), variants[resolved], className)}
      // A loading button must not be pressable again, or a slow save becomes
      // two saves.
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function LinkButton({
  href,
  variant,
  tone,
  size = 'md',
  className = '',
  children,
  ...rest
}: {
  href: string
  variant?: Variant
  tone?: LegacyTone
  size?: Size
  className?: string
  children: ReactNode
} & Omit<
  React.ComponentProps<typeof Link>,
  'href' | 'className' | 'children' | 'size' | 'tone'
>) {
  const resolved: Variant = variant ?? (tone ? legacyTone[tone] : 'secondary')
  return (
    <Link href={href} className={cx(base, pad(size), variants[resolved], className)} {...rest}>
      {children}
    </Link>
  )
}

/** The previous name, kept so existing pages keep compiling. */
export const ButtonLink = LinkButton

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* -- page scaffolding --------------------------------------------------- */

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  breadcrumbs,
  breadcrumb,
}: {
  title: string
  subtitle?: ReactNode
  /** The previous name for `subtitle`. */
  description?: ReactNode
  actions?: ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  /** The previous name for `breadcrumbs`. */
  breadcrumb?: { label: string; href?: string }[]
}) {
  const crumbs = breadcrumbs ?? breadcrumb
  const under = subtitle ?? description

  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1.5 text-[12px] text-slate-400">
          {crumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden>/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* 20px, not 32. This is a page inside an application, not a landing
              page — an outsized heading pushes the content below the fold. */}
          <h1 className="truncate text-[32px] font-bold leading-tight tracking-[-0.03em] text-ink">
            {title}
          </h1>
          {under && <div className="mt-2 text-[16px] text-ink-muted">{under}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{children}</h2>
      {action}
    </div>
  )
}

/** Whether the enclosing Panel already pads its content, so a header inside it does not pad twice. */
const PanelPadding = createContext(false)

export function Panel({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div className={cx('surface', padded && 'p-6', className)}>
      <PanelPadding.Provider value={padded}>{children}</PanelPadding.Provider>
    </div>
  )
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  const padded = useContext(PanelPadding)
  return (
    <div className={cx('flex items-start justify-between gap-3', padded ? 'pb-3' : 'px-6 pb-2 pt-6')}>
      <div className="min-w-0">
        <h2 className="text-[18px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
        {description && <div className="mt-1 text-[13px] text-ink-muted">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* -- badges ------------------------------------------------------------- */

export type Tone =
  | 'neutral'
  | 'ok'
  | 'caution'
  | 'abnormal'
  | 'critical'
  | 'brand'
  // The previous names, so pages written against them keep compiling.
  | 'positive'
  | 'info'
  | 'accent'

const badgeTone: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-muted',
  ok: 'bg-ok-soft text-ok',
  positive: 'bg-ok-soft text-ok',
  caution: 'bg-caution-soft text-caution',
  abnormal: 'bg-abnormal-soft text-abnormal',
  critical: 'bg-critical-soft text-critical',
  brand: 'bg-brand-soft text-brand',
  accent: 'bg-brand-soft text-brand',
  info: 'bg-brand-soft text-brand',
}

export function Badge({
  children,
  tone = 'neutral',
  dot,
}: {
  children: ReactNode
  tone?: Tone
  dot?: boolean
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        'text-[12px] font-semibold leading-4 whitespace-nowrap',
        badgeTone[tone],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

/**
 * The status vocabulary, in one place.
 *
 * Every screen showing a status reads this, so `refunded` is never amber on one
 * page and red on another.
 */
const STATUS_TONE: Record<string, Tone> = {
  pending: 'caution', paid: 'ok', processing: 'brand', shipped: 'brand',
  delivered: 'ok', cancelled: 'neutral', refunded: 'critical',
  partially_refunded: 'caution',
  succeeded: 'ok', failed: 'critical',
  unfulfilled: 'caution', fulfilled: 'ok', partially_fulfilled: 'caution',
  returned: 'neutral', unpaid: 'neutral', authorized: 'brand',
  active: 'ok', draft: 'neutral', archived: 'neutral', paused: 'caution',
  scheduled: 'brand', completed: 'neutral', disabled: 'neutral',
  expired: 'neutral', exhausted: 'neutral', published: 'ok', hidden: 'neutral',
  in_stock: 'ok', low_stock: 'caution', out_of_stock: 'critical', untracked: 'neutral',
  connected: 'ok', disconnected: 'neutral', error: 'critical', verified: 'ok',
  sending: 'brand', queued: 'neutral', running: 'brand', complete: 'ok',
  recovered: 'ok', notified: 'brand',
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-slate-300">—</span>
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}

/* -- tables ------------------------------------------------------------- */

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    // The wrapper scrolls, not the page. A wide table must never make the whole
    // document scroll sideways.
    <div className={cx('surface overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">{children}</table>
      </div>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      {children}
    </thead>
  )
}

export function TH({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <th
      className={cx(
        'px-5 pb-3 pt-5 text-[13px] font-medium text-ink-muted whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}

export function TR({
  children,
  href,
  className = '',
}: {
  children: ReactNode
  href?: string
  className?: string
}) {
  if (href) {
    return (
      <tr
        className={cx('row-hover cursor-pointer', className)}
        onClick={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('a,button,input,select,label')) return
          // The first anchor in the row is its destination by convention — the
          // identifier cell. No marker attribute, because Inertia's `Link`
          // rejects props it does not know about.
          event.currentTarget.querySelector<HTMLAnchorElement>('a')?.click()
        }}
      >
        {children}
      </tr>
    )
  }
  return <tr className={cx('row-hover', className)}>{children}</tr>
}

export function TD({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <td
      className={cx(
        'px-5 py-4 align-middle text-[14px] font-medium text-ink',
        align === 'right' && 'text-right num',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  )
}

/* -- empty / loading / error -------------------------------------------- */

export function Empty({
  title,
  body,
  action,
  icon,
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    // Never a blank rectangle. An empty state says what would be here, why it
    // is not, and what to do — the difference between "no data" and a screen
    // that looks broken.
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
          {icon}
        </div>
      )}
      <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * The placeholder a deferred prop shows before it arrives.
 *
 * Shaped like the thing that is coming, so the layout does not jump when it
 * does — a spinner would tell the reader less and move more.
 */
export function Skeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={cx('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-4" style={{ width: `${100 - index * 7}%` }} />
      ))}
    </div>
  )
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="surface grid grid-cols-2 divide-line overflow-hidden sm:grid-cols-4 sm:divide-x dark:divide-slate-800">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="p-5">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-3 h-7 w-24" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  title?: string
  body?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-critical-soft text-critical">
        <IconWarning className="h-5 w-5" />
      </div>
      <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-[13px] text-slate-500">{body}</p>}
      {onRetry && (
        <Button className="mt-5" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/* -- figures ------------------------------------------------------------ */

/**
 * A row of figures, divided by hairlines rather than boxed as cards.
 *
 * Cards in a grid put five borders around each number and turn a summary into a
 * patchwork. One bordered container with dividers reads as one object.
 */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="stat-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

/** A figure that counts up to its value. */
export function Counted({ text }: { text: string }) {
  return <>{useCountUp(text)}</>
}

export function Stat({
  label,
  value,
  hint,
  trend,
  tone,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  trend?: number | null
  tone?: Tone
  icon?: ReactNode
}) {
  const hasTrend = trend !== undefined && trend !== null
  return (
    <div className="surface flex flex-col p-6">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sunken text-ink">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{label}</span>
      </div>
      <div
        className={cx(
          'mt-6 text-[34px] font-bold leading-none tracking-[-0.03em] num',
          tone === 'critical' && 'text-critical',
          (tone === 'ok' || tone === 'positive') && 'text-ok',
          !tone && 'text-ink',
        )}
      >
        {typeof value === 'string' ? <Counted text={value} /> : value}
      </div>
      {(hint || hasTrend) && (
        <div className="mt-4 flex items-end justify-between gap-3 text-[13px] text-ink-muted">
          <span className="min-w-0">{hint}</span>
          {hasTrend && (
            <span
              className={cx(
                'shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-bold num',
                trend >= 0 ? 'bg-ok text-surface' : 'bg-critical text-surface',
              )}
            >
              {trend >= 0 ? '+' : '−'}
              {Math.abs(trend * 100).toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* -- forms -------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  required,
  className = '',
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  children: ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-200">
          {label}
          {required && <span className="ml-0.5 text-critical">*</span>}
        </label>
      )}
      {children}
      {/* The error replaces the hint rather than stacking under it: two lines
          of guidance under one field is where a form starts to feel anxious. */}
      {error ? (
        <p className="text-[12px] text-critical">{error}</p>
      ) : (
        hint && <p className="text-[12px] text-slate-500">{hint}</p>
      )}
    </div>
  )
}

const control =
  'w-full rounded-2xl border bg-sunken px-4 py-3 text-[14px] text-ink ' +
  'placeholder:text-ink-faint transition focus:border-brand focus:outline-none ' +
  'disabled:opacity-50'

export function Input({
  invalid,
  className = '',
  ...rest
}: { invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(control, invalid ? 'border-critical' : 'border-transparent', className)}
      {...rest}
    />
  )
}

export function Textarea({
  invalid,
  className = '',
  ...rest
}: { invalid?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        control,
        'min-h-24 resize-y leading-relaxed',
        invalid ? 'border-critical' : 'border-transparent',
        className,
      )}
      {...rest}
    />
  )
}

export function Select({
  children,
  invalid,
  className = '',
  ...rest
}: { children: ReactNode; invalid?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        control,
        'appearance-none bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-9',
        invalid ? 'border-critical' : 'border-transparent',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%2394a3b8' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  hint,
  className = '',
  ...rest
}: { label: ReactNode; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border-line accent-brand"
        {...rest}
      />
      <span className="min-w-0">
        <span className="block text-[13px] text-slate-700 dark:text-slate-200">{label}</span>
        {hint && <span className="block text-[12px] text-slate-500">{hint}</span>}
      </span>
    </label>
  )
}

/* -- filters ------------------------------------------------------------ */

export function Tabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: { key: string; label: string; count?: number }[]
  active: string
  onSelect: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={cx(
            'whitespace-nowrap rounded-full px-5 py-2.5 text-[14px] font-semibold transition',
            tab.key === active
              ? 'bg-ink text-surface'
              : 'text-ink-muted hover:bg-surface hover:text-ink',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cx('ml-1.5 num', tab.key === active ? 'opacity-70' : 'text-slate-400')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cx('relative', className)}>
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-12"
      />
    </div>
  )
}

/* -- overlays ----------------------------------------------------------- */

export function Popover({
  trigger,
  children,
  align = 'right',
  className = '',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (props: { close: () => void }) => ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div
          className={cx(
            'surface border border-line absolute z-40 mt-2 min-w-52 p-1.5',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  children,
  onClick,
  href,
  tone,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  tone?: 'danger'
}) {
  const className = cx(
    'flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition',
    'hover:bg-slate-100 dark:hover:bg-slate-800',
    tone === 'danger' ? 'text-critical' : 'text-slate-700 dark:text-slate-200',
  )
  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // The page behind must not scroll while a modal is open, or dismissing it
    // returns the reader somewhere they did not choose to be.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('surface border border-line relative z-10 w-full', widths[width])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
            {description && <div className="mt-0.5 text-[12px] text-slate-500">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1.5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* -- pagination --------------------------------------------------------- */

export function Pager({
  page,
  pages,
  total,
  onPage,
}: {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}) {
  if (pages <= 1) {
    return (
      <div className="px-4 py-3 text-[12px] text-slate-400">
        {total} {total === 1 ? 'result' : 'results'}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[12px] text-slate-400 num">
        Page {page} of {pages} · {total} results
      </span>
      <div className="flex gap-2">
        <Button size="xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="xs" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

/* -- misc --------------------------------------------------------------- */

export function Timeline({
  entries,
}: {
  entries: {
    id: number | string
    title: ReactNode
    meta?: ReactNode
    body?: ReactNode
    tone?: Tone
  }[]
}) {
  if (entries.length === 0) {
    return <Empty title="Nothing yet" body="Activity will appear here as it happens." />
  }
  const dot: Record<Tone, string> = {
    neutral: 'bg-slate-300',
    ok: 'bg-ok',
    positive: 'bg-ok',
    caution: 'bg-caution',
    abnormal: 'bg-abnormal',
    critical: 'bg-critical',
    brand: 'bg-brand',
    accent: 'bg-brand',
    info: 'bg-brand',
  }
  return (
    <ol className="relative space-y-4">
      {/* One continuous rule behind the dots, rather than a segment per entry —
          which would show a gap wherever two entries differ in height. */}
      <div className="absolute bottom-2 left-[3.5px] top-2 w-px bg-line dark:bg-slate-800" aria-hidden />
      {entries.map((entry) => (
        <li key={entry.id} className="relative flex gap-3">
          <span
            className={cx(
              'mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-white dark:ring-slate-900',
              dot[entry.tone ?? 'neutral'],
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] text-slate-700 dark:text-slate-200">{entry.title}</span>
              {entry.meta && <span className="text-[12px] text-slate-400">{entry.meta}</span>}
            </div>
            {entry.body && <div className="mt-0.5 text-[12px] text-slate-500">{entry.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function KeyValue({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line dark:divide-slate-800">
      {rows.map((row, index) => (
        <div key={index} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-[12px] text-slate-500">{row.label}</dt>
          <dd className="text-right text-[13px] font-medium text-slate-800 num dark:text-slate-100">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Banner({
  tone = 'neutral',
  title,
  children,
  action,
}: {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  const surfaces: Record<Tone, string> = {
    neutral: 'bg-surface',
    ok: 'bg-ok-soft',
    positive: 'bg-ok-soft',
    caution: 'bg-caution-soft',
    abnormal: 'bg-abnormal-soft',
    critical: 'bg-critical-soft',
    brand: 'bg-brand-soft',
    accent: 'bg-brand-soft',
    info: 'bg-brand-soft',
  }
  return (
    <div
      className={cx(
        'flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius)] px-6 py-5',
        surfaces[tone],
      )}
    >
      <div className="min-w-0">
        {title && (
          <p className="text-[15px] font-bold text-ink">{title}</p>
        )}
        {children && <div className="mt-0.5 text-[14px] text-ink-muted">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** A monospace reference — an order number, a key prefix, a provider id. */
export function Mono({ children }: { children: ReactNode }) {
  return <code className="id text-slate-600 dark:text-slate-300">{children}</code>
}
