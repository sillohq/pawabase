/**
 * A short, guided tour of the dashboard — shown once, right after a store is
 * created.
 *
 * Built on `data-tour="<key>"` attributes scattered across `AppLayout` and
 * whatever page mounts this, rather than a fixed pixel map: the sidebar and
 * the page render independently, so the only reliable way to point at "the
 * search bar" is to ask the DOM where it actually ended up.
 *
 * A spotlight is one element, not a mask with a cutout: a fixed backdrop plus
 * a second box positioned exactly over the target, given the backdrop's own
 * colour and an enormous `box-shadow` that reaches every edge of the screen.
 * The illusion is a hole; the mechanism is a shadow.
 */

import { useEffect, useMemo, useState } from 'react'
import { IconChevronRight, IconClose } from '@/views/ui/icons'

export type TourStep = {
  key: string
  title: string
  body: string
  /** Which side of the target the card opens on. Auto-flips near an edge. */
  side?: 'right' | 'left' | 'bottom' | 'top'
}

type Rect = { top: number; left: number; width: number; height: number }

function measure(el: Element): Rect {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function Tour({ steps, active, onDone }: { steps: TourStep[]; active: boolean; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [ready, setReady] = useState(false)
  const step = steps[index]

  // Waits for the target to exist — the sidebar and the checklist card can
  // both still be mid-render on the first tick after the page mounts.
  useEffect(() => {
    if (!active) return
    setReady(false)
    setRect(null)
    let cancelled = false
    let tries = 0
    const poll = () => {
      if (cancelled) return
      const el = document.querySelector(`[data-tour="${step.key}"]`)
      // A hidden element (the sidebar, collapsed on a narrow screen) measures
      // as zero-size — skip straight to the next step rather than spotlight
      // an empty corner of the page.
      if (el && el.getBoundingClientRect().width > 0) {
        el.scrollIntoView({ block: 'center', behavior: tries === 0 ? 'auto' : 'smooth' })
        window.setTimeout(() => {
          if (cancelled) return
          setRect(measure(el))
          setReady(true)
        }, 220)
        return
      }
      if (el) {
        if (index < steps.length - 1) setIndex(index + 1)
        else onDone()
        return
      }
      if (tries++ < 40) window.setTimeout(poll, 100)
      else onDone()
    }
    poll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index])

  useEffect(() => {
    if (!active || !ready) return
    const el = document.querySelector(`[data-tour="${step.key}"]`)
    if (!el) return
    const update = () => setRect(measure(el))
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ready, index])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index])

  const card = useMemo(() => {
    if (!rect) return null
    const pad = 14
    const side = step.side ?? (rect.left > window.innerWidth * 0.6 ? 'left' : 'right')
    const cardWidth = 300
    if (side === 'right') {
      return { top: Math.max(16, rect.top + rect.height / 2 - 80), left: Math.min(window.innerWidth - cardWidth - 16, rect.left + rect.width + pad) }
    }
    if (side === 'left') {
      return { top: Math.max(16, rect.top + rect.height / 2 - 80), left: Math.max(16, rect.left - cardWidth - pad) }
    }
    if (side === 'top') {
      return { top: Math.max(16, rect.top - 190), left: Math.min(window.innerWidth - cardWidth - 16, Math.max(16, rect.left)) }
    }
    return { top: Math.min(window.innerHeight - 220, rect.top + rect.height + pad), left: Math.min(window.innerWidth - cardWidth - 16, Math.max(16, rect.left)) }
  }, [rect, step])

  if (!active) return null

  const next = () => (index < steps.length - 1 ? setIndex(index + 1) : onDone())
  const back = () => index > 0 && setIndex(index - 1)

  return (
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      {/* the spotlight: a box the shape of the target, its shadow filling the rest of the screen */}
      {rect && (
        <div
          className="pointer-events-none fixed rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(10, 10, 12, 0.72)',
            outline: '2px solid rgba(255,255,255,0.9)',
            outlineOffset: 2,
          }}
        />
      )}

      {!ready && <div className="fixed inset-0 bg-[rgba(10,10,12,0.72)] transition-opacity duration-300" />}

      {ready && card && (
        <div
          key={step.key}
          className="rise fixed w-[300px] rounded-2xl bg-surface p-5 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-[top,left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ top: card.top, left: card.left }}
        >
          <button
            type="button"
            onClick={onDone}
            aria-label="Close tour"
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>

          <div className="mb-3 flex items-center gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= index ? 'bg-brand' : 'bg-line-soft'}`} />
            ))}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Step {index + 1} of {steps.length}
          </p>
          <h3 className="mt-1 text-[15.5px] font-bold tracking-[-0.01em] text-ink">{step.title}</h3>
          <p className="mt-1.5 text-[13px] leading-snug text-ink-muted">{step.body}</p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button type="button" onClick={onDone} className="text-[12.5px] font-medium text-ink-muted hover:text-ink">
              Skip tour
            </button>
            <div className="flex gap-1.5">
              {index > 0 && (
                <button type="button" onClick={back} className="flex h-8 items-center rounded-full border border-line px-3 text-[12.5px] font-medium text-ink-muted hover:text-ink">
                  Back
                </button>
              )}
              <button type="button" onClick={next} className="flex h-8 items-center gap-1 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-surface">
                {index < steps.length - 1 ? 'Next' : 'Done'}
                <IconChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
