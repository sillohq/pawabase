/**
 * The builder's own chrome, replacing the SDK's.
 *
 * Everything registered here is registered at **module scope**, not inside a
 * component. The SDK reads its registries once while mounting, so a
 * `registerChaiTopBar` call in a `useEffect` runs after the editor has already
 * decided what its top bar is — which is why the first attempt at this showed
 * the library's default bar with a "Clear" button and a zoom control nobody
 * asked for.
 *
 * Two things this exists to guarantee:
 *
 * **Nothing says ChaiBuilder.** The library is an implementation detail of our
 * page builder, not a product a merchant is using. Its one piece of branding —
 * a logo on the small-screen notice — is replaced below, and the top bar is
 * ours entirely.
 *
 * **The panels are ours.** A Sections panel offering whole prebuilt bands is
 * the thing a merchant actually reaches for; the SDK's own block list is left
 * in place beside it for anyone assembling something from parts.
 */

import { ChaiDraggableBlock, registerChaiSidebarPanel, registerChaiTopBar } from '@chaibuilder/sdk'
import type { ChaiBlock } from '@chaibuilder/runtime'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SitePanel, type Palette, type SiteChrome } from '@/views/ui/chai/site'
import { toChai } from '@/views/ui/chai/tree'
import { RenderBlocks, type BlockContext, type BlockNode } from '@/views/ui/blocks'
import { LogoMark } from '@/views/ui/Logo'

/** One prebuilt band, as the server describes it. */
export type SectionPreset = {
  key: string
  name: string
  description: string
  group: string
  group_label: string
  blocks: BlockNode[]
}

/**
 * State the registered components need but cannot be passed.
 *
 * The SDK constructs these itself from a registry, so there is no prop channel
 * and no context above them — the canvas is an iframe in a tree we do not own.
 * A module-level box is the honest way to do it; it is written once when the
 * editor mounts and read during render, and it never changes while a page is
 * being edited.
 */
type Chrome = {
  topBar: ReactNode
  sections: SectionPreset[]
  storeName: string
  /** What the panel's miniature previews draw against. */
  previewContext: BlockContext
  /** The shop's chrome and its palettes, for the Site panel. */
  site: SiteChrome | null
  palettes: Palette[]
  /** The store's live colours, for the custom-colour editor. */
  themeColors: Record<string, string>
  cornerStyle: string
}

let chrome: Chrome = {
  topBar: null,
  sections: [],
  storeName: '',
  previewContext: { products: [], collections: [] },
  site: null,
  palettes: [],
  themeColors: {},
  cornerStyle: 'soft',
}

export function setChrome(next: Partial<Chrome>) {
  chrome = { ...chrome, ...next }
}

/* -- the top bar --------------------------------------------------------- */

registerChaiTopBar(function TopBarSlot() {
  return <>{chrome.topBar}</>
})

/* -- the sections panel --------------------------------------------------- */

/**
 * The Sections panel: browse by what a band is *for*, and see it.
 *
 * **The tiles are the sections, rendered.** Not a screenshot, not an icon —
 * the real block tree drawn through the real renderers, scaled down. A name
 * and a sentence tells a merchant nothing about whether a hero is centred or
 * split; a picture of it answers immediately, and a picture generated from the
 * section itself can never go stale.
 *
 * **The whole section, in a small tile.** Each tile shows the entire band
 * scaled to fit, two to a row. The earlier version drew one full-width strip
 * per section showing only its top 72 pixels — for most sections that is their
 * top padding and a line of text, so the list was long *and* told you little.
 * A section's shape is what a merchant chooses between; the copy is readable in
 * the preview, one click away.
 *
 * **The preview opens inside the panel**, above the grid, rather than widening
 * the panel beside it and squeezing the canvas the merchant is building.
 */
function SectionsPanel() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string>('hero')
  const [previewing, setPreviewing] = useState<SectionPreset | null>(null)

  const groups = useMemo(() => {
    const order: string[] = []
    for (const preset of chrome.sections) {
      if (!order.includes(preset.group)) order.push(preset.group)
    }
    return order.map((key) => ({
      key,
      label: chrome.sections.find((preset) => preset.group === key)?.group_label ?? key,
      count: chrome.sections.filter((preset) => preset.group === key).length,
    }))
  }, [])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle) {
      return chrome.sections.filter(
        (preset) =>
          preset.name.toLowerCase().includes(needle) ||
          preset.description.toLowerCase().includes(needle) ||
          preset.group_label.toLowerCase().includes(needle),
      )
    }
    return chrome.sections.filter((preset) => preset.group === group)
  }, [query, group])

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="space-y-2.5 border-b border-line px-3 pt-3 pb-2.5">
        <div className="relative">
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sections"
            className="h-8 w-full rounded-[var(--radius-md)] border border-line bg-surface pr-2.5 pl-8 text-[12.5px] text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand-ring"
          />
        </div>

        {/* The shelves, as chips. With twelve of them a vertical list would be
            most of the panel before a single section is visible. */}
        {!query && (
          <div className="-mx-0.5 flex flex-wrap gap-1">
            {groups.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => {
                  setGroup(entry.key)
                  setPreviewing(null)
                }}
                className={
                  entry.key === group
                    ? 'inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11.5px] font-medium text-surface'
                    : 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] text-ink-muted transition hover:bg-sunken hover:text-ink'
                }
              >
                {entry.label}
                <span className={entry.key === group ? 'text-surface/60' : 'text-ink-faint'}>
                  {entry.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {previewing && (
          <SectionPreview preset={previewing} onClose={() => setPreviewing(null)} />
        )}

        {shown.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-ink-faint">Nothing matches that.</p>
        ) : (
          <div data-section-grid className="grid grid-cols-2 gap-2.5">
            {shown.map((preset) => (
              <SectionTile
                key={preset.key}
                preset={preset}
                active={previewing?.key === preset.key}
                onSelect={() => setPreviewing(preset)}
              />
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">
          Drag a section onto the page, or click it for a closer look.
        </p>
      </div>
    </div>
  )
}

/** One browsable tile: the whole section, drawn small. */
function SectionTile({
  preset,
  active,
  onSelect,
}: {
  preset: SectionPreset
  active: boolean
  onSelect: () => void
}) {
  return (
    <ChaiDraggableBlock blocks={toChai(preset.blocks) as ChaiBlock[]}>
      <button
        type="button"
        onClick={onSelect}
        title={preset.description}
        className="group block w-full cursor-grab text-left active:cursor-grabbing"
      >
        <div
          className={`overflow-hidden rounded-[var(--radius-lg)] border bg-canvas transition ${
            active
              ? 'border-brand ring-3 ring-brand-ring'
              : 'border-line group-hover:border-ink-faint'
          }`}
        >
          <MiniRender blocks={preset.blocks} height={96} width={1024} />
        </div>
        <div
          className={`mt-1.5 truncate px-0.5 text-[12px] ${
            active ? 'font-medium text-brand-strong' : 'text-ink'
          }`}
        >
          {preset.name}
        </div>
      </button>
    </ChaiDraggableBlock>
  )
}

/** The larger look, at the top of the panel. */
function SectionPreview({ preset, onClose }: { preset: SectionPreset; onClose: () => void }) {
  return (
    <div className="mb-3.5 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-2">
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-medium text-ink">{preset.name}</div>
          <div className="text-[11.5px] leading-snug text-ink-muted">{preset.description}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="-mt-0.5 -mr-1 shrink-0 rounded-[var(--radius-sm)] p-1 text-ink-faint transition hover:bg-sunken hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <ChaiDraggableBlock blocks={toChai(preset.blocks) as ChaiBlock[]}>
        <div className="cursor-grab border-t border-line bg-canvas active:cursor-grabbing">
          <MiniRender blocks={preset.blocks} height={200} width={1024} />
        </div>
      </ChaiDraggableBlock>
      <div className="border-t border-line px-3 py-2 text-[11px] text-ink-faint">
        Drag onto the page. Every heading, button and picture in it stays editable.
      </div>
    </div>
  )
}

/**
 * A section drawn at a fraction of its size, whole.
 *
 * Rendered at a real desktop width and scaled with a transform, rather than
 * rendered small. 1024px is the `lg` breakpoint: the desktop layout still
 * applies, and the drawing is as large as it can be while it does. Rendered small, a section laid out in a 150px box believes it is on a phone,
 * and the merchant would be choosing between mobile layouts for a desktop page.
 *
 * The scale fits the *whole* section into the box — by width or by height,
 * whichever binds — and it is measured with a ResizeObserver, not once. The
 * first version read the box's width a single time, when the tile mounted; the
 * panel is still animating open at that moment, so every tile was scaled for a
 * box narrower than the one it ended up in, and drew as a half-width sliver.
 *
 * `pointer-events: none` inside, so the drag is on the tile and a click cannot
 * land on a link within the preview.
 */
function MiniRender({
  blocks,
  height,
  width,
}: {
  blocks: BlockNode[]
  height: number
  width: number
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ box: 0, content: 0 })

  useEffect(() => {
    const box = boxRef.current
    const content = contentRef.current
    if (!box || !content) return
    const measure = () => setSize({ box: box.clientWidth, content: content.scrollHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  const byWidth = size.box / width
  const byHeight = size.content ? height / size.content : byWidth
  const scale = size.box ? Math.min(byWidth, byHeight) : 0
  const drawnWidth = width * scale
  const drawnHeight = size.content * scale

  return (
    <div ref={boxRef} className="relative overflow-hidden" style={{ height }} aria-hidden>
      <div
        ref={contentRef}
        className="pointer-events-none absolute origin-top-left bg-white"
        style={{
          width,
          left: Math.max(0, (size.box - drawnWidth) / 2),
          top: Math.max(0, (height - drawnHeight) / 2),
          transform: `scale(${scale})`,
          visibility: scale ? 'visible' : 'hidden',
        }}
      >
        <RenderBlocks blocks={blocks} context={chrome.previewContext} />
      </div>
    </div>
  )
}

registerChaiSidebarPanel('sections', {
  position: 'top',
  view: 'standard',
  label: 'Sections',
  // Narrow: two small tiles to a row, and the preview opens inside the panel
  // rather than beside it, so the canvas keeps its width while browsing.
  width: 360,
  panel: SectionsPanel,
  button: ({ isActive, show }) => (
    <button
      type="button"
      onClick={show}
      title="Sections"
      aria-label="Sections"
      className={
        isActive
          ? 'flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-ink text-surface'
          : 'flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-ink-muted transition hover:bg-sunken hover:text-ink'
      }
    >
      {/* Stacked bands — what a section is. */}
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="2" y="2.5" width="12" height="3.5" rx="1" />
        <rect x="2" y="8" width="12" height="5.5" rx="1" />
      </svg>
    </button>
  ),
})

/* -- the site panel -------------------------------------------------------- */

registerChaiSidebarPanel('site', {
  position: 'top',
  view: 'standard',
  label: 'Site',
  width: 320,
  panel: () =>
    chrome.site ? (
      <SitePanel
        site={chrome.site}
        palettes={chrome.palettes}
        themeColors={chrome.themeColors}
        cornerStyle={chrome.cornerStyle}
        onSaved={() => {
          // The header, the logo and the announcement wrap every page. A
          // partial reload picks the new values up without losing the block
          // the merchant had selected or where they had scrolled to.
          window.dispatchEvent(new CustomEvent('commerce:site-saved'))
        }}
      />
    ) : null,
  button: ({ isActive, show }) => (
    <button
      type="button"
      onClick={show}
      title="Site"
      aria-label="Site"
      className={
        isActive
          ? 'flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-ink text-surface'
          : 'flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-ink-muted transition hover:bg-sunken hover:text-ink'
      }
    >
      {/* A page with a header bar on it — what this panel edits. */}
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
        <path d="M2 6h12M4.5 4.2h1M6.8 4.2h1" strokeLinecap="round" />
      </svg>
    </button>
  ),
})

/* -- the AI assistant, removed -------------------------------------------- */

/**
 * The library's AI panel, replaced with nothing.
 *
 * Registering an empty panel over its id is what actually removes it: the rail
 * button and the panel both come from the registry, so overwriting the entry
 * is cleaner than hiding the button with CSS and hoping the shortcut, the
 * command and the keyboard path go with it.
 *
 * Why it goes: it writes into a merchant's public storefront through a service
 * we do not control, with no record on our side of what was sent or what came
 * back. If this platform offers writing help it will be ours, on our terms,
 * and auditable. A sparkle button that quietly ships someone's page to a third
 * party is not a feature we are shipping by accident.
 */
registerChaiSidebarPanel('chai-chat-panel', {
  position: 'top',
  view: 'standard',
  label: '',
  width: 0,
  isInternal: true,
  panel: () => null,
  button: () => null,
})

/* -- the small-screen notice ---------------------------------------------- */

/**
 * Shown below 1280px in place of the editor.
 *
 * Ours because the library's carries its own logo, and because "Screen too
 * small" in 48px type is a scolding. A merchant on a laptop should be told
 * what to do and given somewhere to go.
 */
export const SmallScreen: ComponentType = function SmallScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <LogoMark className="h-8 w-8 text-ink" />
      <div className="max-w-xs space-y-1.5">
        <h2 className="text-[16px] font-semibold text-ink">
          The builder needs a wider window
        </h2>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Arranging a page needs room for the canvas and its settings side by side.
          Open this on a screen at least 1280px wide.
        </p>
      </div>
      <a
        href="/storefront/pages"
        className="rounded-full bg-ink px-4 py-2 text-[12.5px] font-medium text-surface"
      >
        Back to pages
      </a>
    </div>
  )
}
