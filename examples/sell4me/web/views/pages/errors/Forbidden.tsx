import { Head, Link } from '@inertiajs/react'
import { Mono } from '@/views/ui/kit'

/**
 * A member reached something their role does not cover.
 *
 * Names the missing permission. "You do not have access" leaves a merchant
 * guessing which role to grant; `orders.refund` tells their admin exactly what
 * to change.
 */
export default function Forbidden({ permission }: { permission: string | null }) {
  return (
    <>
      <Head title="Not allowed" />
      <div className="panel p-6 text-center">
        <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-caution-soft)] text-[var(--color-caution)]">
          <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <rect x="3.4" y="7" width="9.2" height="6.4" rx="1.2" />
            <path d="M5.6 7V4.9a2.4 2.4 0 0 1 4.8 0V7" />
          </svg>
        </div>

        <h1 className="text-[16px] font-semibold text-[var(--color-ink)]">
          You don't have access to this
        </h1>
        <p className="mt-1.5 text-[13px] text-[var(--color-ink-soft)]">
          {permission ? (
            <>Your role is missing the <Mono>{permission}</Mono> permission.</>
          ) : (
            'Your role does not cover this screen.'
          )}
          {' '}Ask an owner or admin to grant it.
        </p>

        <Link
          href="/"
          className="mt-4 inline-block text-[13px] font-medium text-[var(--color-accent)] hover:underline"
        >
          Back to the dashboard
        </Link>
      </div>
    </>
  )
}
