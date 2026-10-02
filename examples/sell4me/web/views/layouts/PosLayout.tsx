/**
 * The POS shell.
 *
 * Full-screen, no sidebar, no top-bar search — just a dark header strip with
 * the store name, the cashier's name, session status, and an escape hatch back
 * to the dashboard. The rest of the viewport is handed to the page.
 *
 * Used exclusively by `pos/Terminal`. Other POS pages (sessions list, config)
 * use the normal `AppLayout` so they sit inside the dashboard's nav.
 */

import { router } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { useAuth } from '@/js/hooks'
import { FlashMessages } from '@/views/ui/FlashMessages'
import { LogoMark } from '@/views/ui/Logo'
import { IconChevronLeft, IconSettings } from '@/views/ui/icons'

export default function PosLayout({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const store = auth.store
  const user = auth.user

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-canvas)]">
      {/* ── POS top bar ─────────────────────────────────────────────── */}
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4">
        {/* Back to dashboard */}
        <button
          type="button"
          onClick={() => router.visit('/pos')}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] py-1 pl-1 pr-2 text-[12.5px] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>

        <div className="h-4 w-px bg-[var(--color-line)]" />

        {/* Branding */}
        <div className="flex items-center gap-2">
          <LogoMark className="h-4 w-4 text-brand" />
          <span className="text-[13px] font-semibold text-[var(--color-ink)]">
            {store?.name ?? 'POS'}
          </span>
          <span className="rounded-[3px] bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            POS
          </span>
        </div>

        <div className="flex-1" />

        {/* Cashier */}
        {user && (
          <span className="text-[12.5px] text-[var(--color-ink-soft)]">
            {user.name}
          </span>
        )}

        {/* Config shortcut */}
        <button
          type="button"
          onClick={() => router.visit('/pos/config')}
          className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]"
          aria-label="POS settings"
        >
          <IconSettings className="h-4 w-4" />
        </button>
      </header>

      {/* ── Flash messages ──────────────────────────────────────────── */}
      <div className="px-4 pt-2">
        <FlashMessages />
      </div>

      {/* ── Page content fills remaining height ─────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
