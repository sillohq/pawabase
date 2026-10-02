/**
 * The small pieces every screen needs.
 *
 * Formatting lives here rather than in components so a date or a percentage
 * looks the same on every screen — and so the rule for each is written down
 * once, where it can be argued with.
 */

import { usePage } from '@inertiajs/react'
import { useCallback, useEffect, useState } from 'react'
import type { Money, SharedProps } from './types'

export function useShared(): SharedProps {
  return usePage().props as unknown as SharedProps
}

export function useAuth() {
  return useShared().auth
}

/**
 * Whether the signed-in member holds a permission.
 *
 * **Cosmetic only.** This hides controls a member cannot use; the gate that
 * actually refuses the action is on the route (`routes/web/_kit.py`). A screen
 * that only hid the button would be one anyone could POST to.
 */
export function useCan(): (permission: string) => boolean {
  const { permissions } = useAuth()
  return useCallback(
    (permission: string) => {
      if (permissions.includes('*')) return true
      if (permissions.includes(permission)) return true
      // `orders.*` grants every action on orders — the same rule the server
      // applies, so the two cannot disagree about what a role can see.
      const resource = permission.split('.')[0]
      return permissions.includes(`${resource}.*`)
    },
    [permissions],
  )
}

/** A money prop, or a dash. Never formats anything itself. */
export function money(value: Money | null | undefined): string {
  return value?.formatted ?? '—'
}

/**
 * A date, in the reader's locale.
 *
 * `medium` rather than `short`, because a table full of `03/09/26` is
 * ambiguous between two continents and `3 Sep 2026` is not.
 */
export function date(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * How long ago, in words.
 *
 * Falls back to an absolute date past a week: "23 days ago" is harder to place
 * than "11 Aug", and precision stops being useful long before that.
 */
export function ago(value: string | null | undefined): string {
  if (!value) return '—'
  const then = new Date(value).getTime()
  const seconds = Math.round((Date.now() - then) / 1000)

  if (seconds < 45) return 'just now'
  if (seconds < 90) return 'a minute ago'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return date(value)
}

/**
 * A rate as a percentage.
 *
 * `null` renders as an em dash, not `0%`. The server sends `null` when there is
 * nothing to divide by, and turning that into a zero would state a fact the
 * data does not support.
 */
export function percent(value: number | null | undefined, places = 1): string {
  if (value === null || value === undefined) return '—'
  return `${(value * 100).toFixed(places)}%`
}

/** A compact count: `1.2k`, `18.4k`. For figures where the exact number does
 *  not matter and the column is narrow. */
export function compact(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value)
}

export function count(value: number): string {
  return new Intl.NumberFormat().format(value)
}

/** `classNames`, kept short because it appears on nearly every element. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * A value that settles after the user stops typing.
 *
 * Used by every search box, so a filter does not fire a request per keystroke.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return settled
}

/** Whether a keyboard shortcut fired, ignoring anything typed into a field. */
export function useShortcut(key: string, handler: () => void, withMeta = true): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const modifier = withMeta ? event.metaKey || event.ctrlKey : true
      if (modifier && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, handler, withMeta])
}

/**
 * The colour theme, remembered per browser.
 *
 * Three states, not two: `system` follows the OS and is the default, so a page
 * opened at night is dark without anyone having chosen anything.
 */
export type Theme = 'light' | 'dark' | 'system'

export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('theme') as Theme) || 'dark'
    } catch {
      // A private window, or site data blocked. Not an error — the default is
      // correct and the preference simply does not persist.
      return 'dark'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* see above */
    }
  }, [theme])

  return [theme, setTheme]
}


const NUMBER = /-?\d[\d,]*(?:\.\d+)?/

/**
 * The first number in `text`, counted up from zero on mount (and again whenever
 * `text` changes), with everything around it — currency symbol, percent sign,
 * "orders" — left exactly as written. That is what lets one hook animate a
 * formatted price, a percentage and a bare count alike without each caller
 * knowing how its figure is formatted.
 *
 * Returns the text as it should be shown right now. A reader who asked for
 * reduced motion gets the final value immediately.
 */
export function useCountUp(text: string, duration = 1400): string {
  const [shown, setShown] = useState(text)

  useEffect(() => {
    const match = text.match(NUMBER)
    if (!match || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text)
      return
    }
    const raw = match[0]
    const target = Number(raw.replace(/,/g, ''))
    const decimals = raw.includes('.') ? raw.split('.')[1]!.length : 0
    const grouped = raw.includes(',')
    const before = text.slice(0, match.index)
    const after = text.slice((match.index ?? 0) + raw.length)

    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      // Ease-out: fast at first, settling on the real figure.
      const eased = 1 - Math.pow(1 - progress, 4)
      const value = target * eased
      const body = value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouped,
      })
      setShown(`${before}${body}${after}`)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, duration])

  return shown
}
