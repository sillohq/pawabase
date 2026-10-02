import { Head, router } from '@inertiajs/react'
import { useCallback, useEffect, useState } from 'react'
import { cx } from '@/js/hooks'
import { RenderBlocks, type BlockContext, type BlockNode } from '@/views/ui/blocks'
import { Badge, Button, Checkbox, Modal, PageHeader, Panel } from '@/views/ui/kit'
import { IconExternal, IconLayout } from '@/views/ui/icons'

/**
 * The template gallery.
 *
 * A template is a whole shop — seven pages, written, arranged and
 * photographed — so the card shows the shop rather than describing it. Each
 * tile renders that template's real homepage through the real block renderers
 * at a fraction of size: a preview generated from the thing itself can never
 * go stale the way a screenshot does, and it is the only honest answer to
 * "what will my shop look like".
 *
 * Colours are not here. A palette used to share this screen and it made
 * "which of these ten shops" look like the same kind of decision as "what
 * colour are my buttons". The palette moved into the builder, where a merchant
 * is looking at the page it changes.
 */

type TemplatePage = { title: string; slug: string; sections: number }

type Template = {
  key: string
  name: string
  description: string
  suits: string
  colors: Record<string, string>
  fonts: { heading: string; body: string }
  corner_style: string
  swatch: string[]
  imagery: string
  style: Record<string, string>
  pages: TemplatePage[]
  home: BlockNode[]
}

type Props = {
  templates: Template[]
  active: string
  storefront_url: string
  builder_url: string
}

const RADIUS: Record<string, string> = { sharp: '0px', soft: '8px', round: '16px' }

/** Nothing resolved: a gallery preview draws layout, not this store's stock. */
const EMPTY: BlockContext = { products: [], collections: [] }

export default function Templates({ templates, active, storefront_url, builder_url }: Props) {
  const [opened, setOpened] = useState<Template | null>(null)

  return (
    <>
      <Head title="Templates" />

      <PageHeader
        title="Templates"
        subtitle="Ten finished shops. Pick one, then change everything about it in the builder."
        actions={
          <>
            <Button variant="ghost" onClick={() => router.visit(builder_url)}>
              <IconLayout className="h-3.5 w-3.5" />
              Open the builder
            </Button>
            <Button variant="secondary" onClick={() => window.open(storefront_url, '_blank')}>
              <IconExternal className="h-3.5 w-3.5" />
              View shop
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.key}
            template={template}
            active={template.name === active}
            onOpen={() => setOpened(template)}
          />
        ))}
      </div>

      <TemplateModal template={opened} onClose={() => setOpened(null)} />
    </>
  )
}

function TemplateCard({
  template,
  active,
  onOpen,
}: {
  template: Template
  active: boolean
  onOpen: () => void
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <ThemedPreview template={template} height={300} width={1440} />
      </button>

      <div className="flex items-start justify-between gap-3 border-t border-[var(--color-line)] px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[14px] font-semibold text-[var(--color-ink)]"
              style={{ fontFamily: `"${template.fonts.heading}", inherit` }}
            >
              {template.name}
            </span>
            {active && <Badge tone="ok">In use</Badge>}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-faint)]">
            {template.suits}
          </p>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)]">
            {template.pages.length} pages · {template.fonts.heading}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onOpen}>
          Preview
        </Button>
      </div>
    </Panel>
  )
}

/**
 * A template's homepage, drawn in its own palette.
 *
 * Rendered at a real desktop width and scaled with a transform. Rendering into
 * a 400px box would lay the page out as if it were a phone, and a merchant
 * would be choosing between mobile layouts to put on a desktop shop.
 *
 * The palette is applied as the `--shop-*` custom properties the renderers
 * read, on a wrapper — the same mechanism the storefront's own layout uses, so
 * the preview and the shop cannot disagree about what a colour means.
 */
function ThemedPreview({
  template,
  height,
  width,
  blocks,
}: {
  template: Template
  height: number
  width: number
  blocks?: BlockNode[]
}) {
  const [box, setBox] = useState(600)
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setBox(node.clientWidth)
  }, [])

  const c = template.colors
  const scale = box / width

  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{ height, background: c.background }}
      aria-hidden
    >
      <div
        // The same class and attributes the live storefront wraps itself in,
        // so the preview is the shop rather than a sketch of it. A gallery
        // that showed every template at one rhythm and one type scale would be
        // showing ten colourways.
        className="shop-surface pointer-events-none absolute left-0 top-0 origin-top-left"
        data-scale={template.style?.scale}
        data-tracking={template.style?.tracking}
        data-case={template.style?.case}
        data-rhythm={template.style?.rhythm}
        data-edge={template.style?.edge}
        data-texture={template.style?.texture}
        data-measure={template.style?.measure}
        style={
          {
            width,
            transform: `scale(${scale})`,
            '--shop-bg': c.background,
            '--shop-surface': c.surface,
            '--shop-text': c.text,
            '--shop-muted': c.muted,
            '--shop-line': c.border,
            '--shop-primary': c.primary,
            '--shop-accent': c.accent,
            '--shop-radius': RADIUS[template.corner_style] ?? '8px',
            '--shop-heading-font': `"${template.fonts.heading}", serif`,
            background: c.background,
            color: c.text,
            fontFamily: `"${template.fonts.body}", ui-sans-serif, system-ui, sans-serif`,
          } as React.CSSProperties
        }
      >
        <RenderBlocks blocks={blocks ?? template.home} context={EMPTY} />
      </div>

      {/* A fade at the bottom, so a page cut mid-section reads as continuing
          rather than as ending abruptly. */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{ background: `linear-gradient(to top, ${c.background}, transparent)` }}
      />
    </div>
  )
}

/**
 * One template, at length: every page it brings, and what applying it does.
 *
 * The other six pages are fetched when this opens. Shipping all seventy with
 * the gallery would be most of a megabyte for a screen where nine templates in
 * ten are never opened.
 */
function TemplateModal({
  template,
  onClose,
}: {
  template: Template | null
  onClose: () => void
}) {
  const [pages, setPages] = useState<{ title: string; slug: string; tree: BlockNode[] }[]>([])
  const [showing, setShowing] = useState(0)
  const [replace, setReplace] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!template) return
    setPages([])
    setShowing(0)
    setReplace(false)
    setLoading(true)

    let cancelled = false
    fetch(`/storefront/templates/${template.key}`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setPages(body.pages ?? [])
      })
      .catch(() => {
        // The homepage is already in hand, so a failed fetch loses the other
        // six previews and nothing else. Not worth an error state.
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [template])

  if (!template) return null

  const current = pages[showing]

  return (
    <Modal
      open
      onClose={onClose}
      width="xl"
      title={template.name}
      description={template.description}
      footer={
        <>
          <Checkbox
            label="Replace pages I already have"
            className="mr-auto"
            checked={replace}
            onChange={(event) => setReplace(event.target.checked)}
          />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={replace ? 'danger' : 'primary'}
            onClick={() =>
              router.post(
                '/storefront/templates/apply',
                { preset: template.key, replace_pages: replace },
                { onSuccess: onClose },
              )
            }
          >
            {replace ? 'Replace my shop' : 'Use this template'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Its pages, as tabs. Seven is few enough to show them all and let a
            merchant look at the one they care about — usually not the home
            page, which is the one every gallery shows. */}
        <div className="flex flex-wrap gap-1.5">
          {template.pages.map((entry, index) => (
            <button
              key={entry.slug}
              type="button"
              onClick={() => setShowing(index)}
              className={cx(
                'rounded-full px-3 py-1 text-[12px] transition',
                index === showing
                  ? 'bg-[var(--color-ink)] text-[var(--color-surface)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-sunken)]',
              )}
            >
              {entry.title}
            </button>
          ))}
        </div>

        <div
          className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)]"
        >
          <ThemedPreview
            template={template}
            height={460}
            width={1440}
            blocks={current ? current.tree : template.home}
          />
        </div>

        {loading && (
          <p className="text-[12px] text-[var(--color-ink-faint)]">Loading the other pages…</p>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div className="flex gap-1">
            {Object.entries(template.colors).map(([slot, color]) => (
              <span
                key={slot}
                title={slot}
                className="h-6 w-6 rounded-[5px] border border-black/10"
                style={{ background: color }}
              />
            ))}
          </div>
          <span className="text-[12px] text-[var(--color-ink-faint)]">
            {template.fonts.heading} · {template.fonts.body} · {template.corner_style} corners
          </span>
        </div>

        <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
          Applying adds every page above as a <strong>draft</strong> — your live shop does not
          change until you publish. With the box below ticked, pages you already have are
          rewritten too.
        </p>
      </div>
    </Modal>
  )
}
