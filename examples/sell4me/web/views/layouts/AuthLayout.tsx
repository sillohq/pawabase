/**
 * The chrome for signing in, signing up, resetting a password and choosing a
 * store — the handful of screens that exist before there is a tenant to show
 * a dashboard for.
 *
 * Built from the same three tokens as `AppLayout`: an outer `--color-frame`,
 * a light card and a dark one. Here the dark card is not a sidebar full of
 * links — it is a promo panel, because there is nothing yet to navigate to.
 * The result reads as one system with the dashboard rather than a plain
 * login box bolted onto it.
 */

import type { ReactNode } from 'react'
import { useShared } from '@/js/hooks'
import { FlashMessages } from '@/views/ui/FlashMessages'
import { LogoMark } from '@/views/ui/Logo'
import { IconCheck } from '@/views/ui/icons'

const BENEFITS = [
  'Launch a store in minutes, not days',
  'Keep 95% of every sale — no monthly fee',
  'Built-in payouts, receipts and a page builder',
]

export default function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { app } = useShared()

  return (
    <div className="min-h-screen p-3 lg:p-4" style={{ background: 'var(--color-frame)' }}>
      <div className={`mx-auto flex min-h-[calc(100vh-1.5rem)] gap-4 lg:min-h-[calc(100vh-2rem)] ${wide ? 'max-w-[880px]' : 'max-w-[1200px]'}`}>
        {/* the promo panel. Fixed dark-on-light colours, like the sidebar's
            pastel callout card — the brand panel should look the same in both
            themes, not invert when `--color-ink` does. Dropped for `wide`
            pages: a long multi-step wizard is already the whole story, and a
            static panel beside it is just something to scroll past. */}
        {!wide && (
          <aside
            className="relative hidden w-[420px] shrink-0 overflow-hidden rounded-[32px] p-9 text-white lg:flex lg:flex-col"
            style={{ background: '#141414' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-90"
              style={{ background: 'var(--color-sage)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full opacity-80"
              style={{ background: 'var(--color-clay)' }}
            />

            <div className="relative flex items-center gap-2.5">
              <LogoMark className="h-8 w-8 text-white" title={app.name} />
              <span className="text-[17px] font-bold tracking-[-0.02em]">{app.name}</span>
            </div>

            <div className="relative mt-auto">
              <p className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em]">
                Everything you need to sell online.
              </p>
              <ul className="mt-7 space-y-3.5">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-[14px] text-white/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                      <IconCheck className="h-3 w-3" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        {/* the form panel */}
        <div className="flex min-w-0 flex-1 flex-col rounded-[32px] bg-[var(--color-surface)] text-[var(--color-ink)]">
          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
            <div className={`w-full ${wide ? 'max-w-[640px]' : 'max-w-[380px]'}`}>
              <div className="mb-7 flex items-center gap-2.5 lg:hidden">
                <LogoMark className="h-7 w-7 text-brand" title={app.name} />
                <span className="text-[14px] font-semibold tracking-[-0.01em]">{app.name}</span>
              </div>

              <FlashMessages />
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WizardLayout({ children }: { children: ReactNode }) {
  return <AuthLayout wide>{children}</AuthLayout>
}

