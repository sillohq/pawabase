/**
 * Block renderers — one set, used by both the builder canvas and the live shop.
 *
 * That sharing is the whole reason the builder is worth having. Two renderers
 * would drift, and the first time they did, a merchant would arrange a page
 * that looked right in the editor and wrong to their customers. There is one
 * function per block type and both surfaces call it.
 *
 * The only difference between the two is `editing`: on the canvas a block with
 * no content yet shows a placeholder describing what it will be, so an empty
 * hero is an outline rather than a blank space. On the shop, an empty block
 * renders nothing at all.
 *
 * Every value has already been through `app/services/builder.py::sanitise`, so
 * a URL here is `http`, `https` or root-relative and a colour is a hex string.
 * The renderers do not re-check; they would be checking the wrong layer.
 */

import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { cx } from '@/js/hooks'
import type { Money } from '@/js/types'
import {
  barChrome,
  renderCartButton,
  renderFlexSpace,
  renderIconButton,
  renderNavLinks,
  renderNavbar,
  renderSearchBox,
  renderSiteLogo,
} from '@/views/ui/navbar'

export type BlockNode = {
  id: string
  type: string
  props: Record<string, unknown>
  children: BlockNode[]
}

/** What the renderers can look up while drawing — resolved server-side. */
export type BlockContext = {
  products: {
    id: number
    title: string
    slug: string
    summary: string | null
    image_url: string | null
    price: Money
    compare_at: Money | null
    available: boolean
  }[]
  /**
   * Products per collection, for a grid that names one.
   *
   * Resolved server-side and keyed by collection id, because a page can hold
   * two grids drawn from two different collections — a single list could only
   * serve one of them, and filtering client-side would mean shipping the whole
   * catalogue to render four tiles.
   */
  productsByCollection?: Record<string, BlockContext['products']>
  collections: { id: number; title: string; slug: string; image_url: string | null }[]
  /**
   * The shop itself — what the navbar draws. Supplied by the layout on the live
   * shop and by the editor on the canvas, because the canvas renders outside
   * Inertia's tree and cannot read page props.
   */
  shop?: {
    name: string
    logo_url: string | null
    header_links: { label: string; url: string }[]
    cart_count: number
  }
  /** True on the builder canvas. Turns on placeholders for empty blocks. */
  editing?: boolean
  /**
   * How a container's children are drawn. The shop leaves this unset and gets
   * `RenderBlocks`; the builder supplies its own, so each child stays
   * individually selectable and droppable.
   *
   * This is what lets one renderer serve both surfaces. Without it the canvas
   * would need its own copy of every container's styling — the padding, the
   * background, the width — and the two would drift the first time one changed.
   */
  renderChildren?: (block: BlockNode) => ReactNode
}

/** A container's children, drawn the way this surface wants them. */
function Children({ block, context }: { block: BlockNode; context: BlockContext }) {
  if (context.renderChildren) return <>{context.renderChildren(block)}</>
  return <RenderBlocks blocks={block.children} context={context} />
}

/**
 * Vertical air, as a multiple of the template's own rhythm.
 *
 * A number rather than a class, because the template scales it: the same
 * "generous" band is 80px in a tight catalogue and 152px in a jeweller's, and
 * that difference is most of why the two do not look like the same shop.
 */
const PADDING_STEP = { sm: 2, md: 3.5, lg: 5, xl: 7 }

/**
 * Content width, from the template's measure.
 *
 * `--shop-measure` is the reading column and `--shop-wide` the layout column;
 * a template set to `narrow` runs both in, `wide` runs both out.
 */
const WIDTH_VAR = {
  narrow: 'var(--shop-measure, 42rem)',
  wide: 'var(--shop-wide, 72rem)',
  full: 'none',
}
const GAP = { sm: 'gap-3', md: 'gap-6', lg: 'gap-10' }
const HEIGHTS = { sm: 'min-h-[18rem]', md: 'min-h-[26rem]', lg: 'min-h-[38rem]' }
const MIN_HEIGHT = { auto: '', md: 'min-h-[50vh]', lg: 'min-h-[75vh]', xl: 'min-h-screen' }
const RATIOS = { auto: '', square: 'aspect-square', wide: 'aspect-video', portrait: 'aspect-[4/5]' }
const TEXT_SIZE = { sm: 'text-[14px]', md: 'text-[16px]', lg: 'text-[18px]', xl: 'text-[21px]' }
/**
 * Heading sizes, as the base a template then scales.
 *
 * `h1` goes through `--shop-display-scale` and the rest through
 * `--shop-scale`, so a poster template blows the display type up hard and
 * leaves the section headings nearly alone — which is what makes it read as
 * editorial rather than as everything-is-bigger.
 */
const HEADING_BASE = { h1: '3rem', h2: '2rem', h3: '1.5rem', h4: '1.2rem' }
const HEADING_LEADING = { h1: 0.98, h2: 1.1, h3: 1.2, h4: 1.3 }

/**
 * Whether a colour is dark enough to need light text on it.
 *
 * Perceived luminance, not the arithmetic mean: the eye is roughly seven times
 * more sensitive to green than to blue, so averaging the channels calls a
 * saturated blue "light" and puts black text on it.
 *
 * Hex only. Every colour that reaches here has been through `safe_color` on
 * the server, which accepts nothing else.
 */
function isDark(color: string): boolean {
  const hex = color.trim().replace('#', '')
  const full =
    hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6)
  if (full.length !== 6) return false

  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55
}

const text = (props: Record<string, unknown>, key: string) => String(props[key] ?? '')
const num = (props: Record<string, unknown>, key: string, fallback: number) =>
  typeof props[key] === 'number' ? (props[key] as number) : fallback
const flag = (props: Record<string, unknown>, key: string) => Boolean(props[key])

/**
 * A placeholder for an empty block, on the canvas only.
 *
 * Says what the block *is* rather than that it is empty — a merchant who
 * dragged in a hero and sees "Hero — add a heading" knows what to do next.
 */
function Placeholder({ label, editing }: { label: string; editing?: boolean }) {
  if (!editing) return null
  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-current/25 px-4 py-6 text-center text-[12.5px] opacity-50">
      {label}
    </div>
  )
}

/**
 * A picture that has not been chosen yet, drawn at the shape it will be.
 *
 * Presets ship no photographs — see `app/services/sections.py` — so this is
 * what stands in, and it has to do two jobs at once. In the builder it is an
 * invitation with the right aspect ratio, so the layout around it reads
 * correctly before anything is uploaded. On a published page it is a quiet
 * neutral panel rather than a gap, because a merchant who publishes before
 * uploading should get a shop that looks unfinished, not one that looks
 * broken.
 */
function ImageSlot({
  ratio,
  rounded = true,
  label = 'Add a picture',
  editing,
}: {
  ratio?: string
  rounded?: boolean
  label?: string
  editing?: boolean
}) {
  return (
    <div
      className={cx(
        'flex w-full items-center justify-center overflow-hidden',
        ratio || 'aspect-[4/3]',
      )}
      style={{
        background: 'var(--shop-surface)',
        borderRadius: rounded ? 'var(--shop-radius)' : 0,
        border: editing ? '1px dashed color-mix(in srgb, currentColor 25%, transparent)' : undefined,
      }}
    >
      {editing && (
        <span className="flex flex-col items-center gap-1.5 text-[11.5px] opacity-45">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
               strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4.5" width="18" height="15" rx="2" />
            <path d="M3 16l4.5-4.5a2 2 0 012.8 0L15 16M14.5 14l1.8-1.8a2 2 0 012.8 0L21 14.5" />
            <circle cx="8.5" cy="9" r="1.2" />
          </svg>
          {label}
        </span>
      )}
    </div>
  )
}

export function RenderBlocks({
  blocks,
  context,
}: {
  blocks: BlockNode[]
  context: BlockContext
}) {
  return (
    <>
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} context={context} />
      ))}
    </>
  )
}

const ANCHOR: Record<string, (x: number, y: number) => React.CSSProperties> = {
  tl: (x, y) => ({ top: y, left: x }),
  tr: (x, y) => ({ top: y, right: x }),
  bl: (x, y) => ({ bottom: y, left: x }),
  br: (x, y) => ({ bottom: y, right: x }),
  tc: (_x, y) => ({ top: y, left: '50%', transform: 'translateX(-50%)' }),
  bc: (_x, y) => ({ bottom: y, left: '50%', transform: 'translateX(-50%)' }),
  center: () => ({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
}
const ANCHOR_LABEL: Record<string, string> = {
  tl: 'top left', tr: 'top right', bl: 'bottom left', br: 'bottom right', tc: 'top centre', bc: 'bottom centre', center: 'centre',
}

/**
 * Where a block sits, from the placement fields every block carries. Null when
 * it is left in the flow on every screen, which is nearly always — those blocks
 * get no wrapper at all.
 */
export function placement(props: Record<string, unknown>): { className: string; style: React.CSSProperties } | null {
  const position = text(props, 'position') || 'flow'
  const show = text(props, 'show_on') || 'all'
  if (position === 'flow' && show === 'all') return null

  const className = show === 'desktop' ? 'max-md:hidden' : show === 'mobile' ? 'md:hidden' : ''
  const x = num(props, 'offset_x', 20)
  const y = num(props, 'offset_y', 20)
  const zIndex = num(props, 'layer', 10)

  let style: React.CSSProperties = {}
  if (position === 'sticky') style = { position: 'sticky', top: y, zIndex }
  else if (position === 'absolute' || position === 'fixed') {
    style = { position, zIndex, ...(ANCHOR[text(props, 'anchor') || 'br'] ?? ANCHOR.br!)(x, y) }
  }
  return { className, style }
}

/** What the canvas says about a block that is placed rather than in the flow. */
export function placementNote(props: Record<string, unknown>): string | null {
  const position = text(props, 'position') || 'flow'
  const show = text(props, 'show_on') || 'all'
  const parts: string[] = []
  if (position === 'sticky') parts.push('sticky')
  if (position === 'absolute' || position === 'fixed') parts.push(`${position} · ${ANCHOR_LABEL[text(props, 'anchor') || 'br'] ?? ''}`)
  if (show !== 'all') parts.push(`${show} only`)
  return parts.length ? parts.join(' · ') : null
}

export function RenderBlock({ block, context }: { block: BlockNode; context: BlockContext }) {
  const renderer = RENDERERS[block.type]
  if (!renderer) {
    // A type the renderer has never heard of. `sanitise` drops these on the
    // way in, so reaching here means a page stored before a block type was
    // removed. Skipped rather than crashing the shop.
    return null
  }
  const drawn = renderer(block, context)
  // The classes from the builder's Style tab. On the canvas the builder puts
  // them on its own wrapper around each block; on the shop this wrapper is
  // that element, so a styled block looks the same in both places. Unstyled
  // blocks get no wrapper, and nothing in the shop's layout changes for them.
  const styles = typeof block.props.styles === 'string' ? block.props.styles.trim() : ''
  if (context.editing) return drawn
  const placed = placement(block.props)
  if (!styles && !placed) return drawn
  return (
    <div className={cx(styles, placed?.className)} style={placed?.style}>
      {drawn}
    </div>
  )
}

/* -- layout ------------------------------------------------------------- */

/**
 * A band of the page — and, with a background image and a height, a hero.
 *
 * There is no separate `hero` block for a composed hero, on purpose. A hero
 * whose heading, copy and button are *props* is a hero whose button cannot be
 * selected, restyled or moved: a merchant clicks it and gets the whole hero's
 * settings panel. Building one out of a section holding a heading, a text and
 * a button makes every part of it a real block, individually editable, exactly
 * like every other part of the page.
 */
function Section(block: BlockNode, context: BlockContext) {
  const { props } = block
  const background = text(props, 'background')
  const image = text(props, 'background_image')
  const textColor = text(props, 'text_color')
  const width = (text(props, 'width') || 'wide') as keyof typeof WIDTH_VAR
  const padding = (text(props, 'padding') || 'lg') as keyof typeof PADDING_STEP
  const height = (text(props, 'min_height') || 'auto') as keyof typeof MIN_HEIGHT
  const centred = text(props, 'align') === 'center'
  const overlay = props.overlay === undefined ? true : flag(props, 'overlay')

  const style: React.CSSProperties = {}
  if (background) style.background = background

  // Text colour is *derived*, not declared, in every case but an explicit
  // override. A preset that hard-codes white is white on white the moment its
  // picture is removed, and a merchant who picks a dark background colour
  // should not have to discover that the text needs changing too.
  if (textColor) {
    style.color = textColor
  } else if ((image && overlay) || (background && isDark(background))) {
    style.color = '#ffffff'
    // The accent goes with it. An eyebrow is drawn in `--shop-accent` — a dark
    // green in one theme, a deep plum in another — and over a darkened
    // photograph that is invisible. Handing the subtree a light substitute is
    // better than making every small coloured thing check its own background.
    ;(style as Record<string, string>)['--shop-accent-on'] = 'rgba(255,255,255,0.85)'
  }
  if (image) {
    style.backgroundImage = `url(${image})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  } else if (height !== 'auto' && !background) {
    // A tall band with neither a colour nor a picture would be a white void.
    // The theme's surface is the honest stand-in: it is a band, it is clearly
    // empty, and it is the colour the merchant's own theme would give it.
    style.background = 'var(--shop-surface)'
  }

  const step = PADDING_STEP[padding] ?? PADDING_STEP.lg
  style.paddingBlock = `calc(${step}rem * var(--shop-rhythm, 1))`

  return (
    <section
      className={cx(
        'relative',
        MIN_HEIGHT[height],
        height !== 'auto' && 'flex items-center',
        centred && 'text-center',
      )}
      style={style}
    >
      {/* Only over a photograph. A scrim over a flat colour just dims it. */}
      {image && overlay && (
        <span className="absolute inset-0 bg-black/40" aria-hidden />
      )}

      <div
        className="relative mx-auto w-full px-5 sm:px-8"
        style={{ maxWidth: WIDTH_VAR[width] ?? WIDTH_VAR.wide }}
      >
        {block.children.length === 0 && !context.renderChildren ? (
          <Placeholder label="Empty section — drag a block in" editing={context.editing} />
        ) : (
          <div className={cx('space-y-6', centred && 'flex flex-col items-center')}>
            <Children block={block} context={context} />
          </div>
        )}
      </div>
    </section>
  )
}

function Columns(block: BlockNode, context: BlockContext) {
  const gap = (text(block.props, 'gap') || 'md') as keyof typeof GAP
  const count = num(block.props, 'count', 2)

  return (
    <div
      className={cx('grid grid-cols-1', GAP[gap] ?? GAP.md)}
      style={{ gridTemplateColumns: `repeat(var(--cols, 1), minmax(0, 1fr))` }}
    >
      {/* The column count only applies from `sm` up: two columns of body copy
          on a phone is unreadable, so they stack. */}
      <style>{`@media (min-width: 640px){ [data-cols="${block.id}"]{ --cols: ${count}; } }`}</style>
      <div data-cols={block.id} className={cx('grid grid-cols-1', GAP[gap] ?? GAP.md)}
        style={{ gridTemplateColumns: `repeat(var(--cols, 1), minmax(0, 1fr))`, gridColumn: '1 / -1' }}>
        <Children block={block} context={context} />
      </div>
    </div>
  )
}

function Column(block: BlockNode, context: BlockContext) {
  return (
    <div className="min-w-0 space-y-5">
      {block.children.length === 0 && !context.renderChildren ? (
        <Placeholder label="Empty column" editing={context.editing} />
      ) : (
        <Children block={block} context={context} />
      )}
    </div>
  )
}

function Spacer(block: BlockNode) {
  const height =
    { xs: 'h-3', sm: 'h-6', md: 'h-12', lg: 'h-24', xl: 'h-40' }[text(block.props, 'height') || 'md'] ?? 'h-12'
  return <div className={cx(height, flag(block.props, 'mobile_hide') && 'hidden sm:block')} aria-hidden />
}

function Divider(block: BlockNode) {
  const space = { none: '', sm: 'my-2', md: 'my-5', lg: 'my-10' }[text(block.props, 'space') || 'md'] ?? ''
  return (
    <hr
      className={cx('border-0', space)}
      style={{
        borderTop: `${text(block.props, 'weight') === 'thick' ? 3 : 1}px ${text(block.props, 'style') || 'solid'} var(--shop-line)`,
      }}
    />
  )
}

/* -- content ------------------------------------------------------------ */

function Hero(block: BlockNode, context: BlockContext) {
  const { props } = block
  const image = text(props, 'image')
  const layout = text(props, 'layout') || 'left'
  const height = (text(props, 'height') || 'md') as keyof typeof HEIGHTS
  const overlay = flag(props, 'overlay') && Boolean(image)

  const copy = (
    <div className={cx('max-w-xl', layout === 'center' && 'mx-auto text-center')}>
      {text(props, 'heading') ? (
        <h1
          className="text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[46px]"
          style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
        >
          {text(props, 'heading')}
        </h1>
      ) : (
        <Placeholder label="Hero — add a heading" editing={context.editing} />
      )}

      {text(props, 'body') && (
        <p className="mt-4 text-[16px] leading-relaxed opacity-75">{text(props, 'body')}</p>
      )}

      {text(props, 'cta_label') && (
        <ShopLink
          href={text(props, 'cta_url') || '/products'}
          className="mt-7 inline-flex items-center px-6 py-3 text-[14px] font-medium"
          style={{
            background: 'var(--shop-primary)',
            color: 'var(--shop-bg)',
            borderRadius: 'var(--shop-radius)',
          }}
        >
          {text(props, 'cta_label')}
        </ShopLink>
      )}
    </div>
  )

  if (layout === 'split') {
    return (
      <div className="grid items-center gap-10 lg:grid-cols-2">
        {copy}
        <div
          className={cx('w-full overflow-hidden', RATIOS.wide)}
          style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}
        >
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Placeholder label="Add an image" editing={context.editing} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cx('relative flex items-center overflow-hidden', image && HEIGHTS[height])}
      style={
        image
          ? {
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 'var(--shop-radius)',
            }
          : undefined
      }
    >
      {overlay && <div className="absolute inset-0 bg-black/40" aria-hidden />}
      <div className={cx('relative w-full', image && 'p-8 text-white sm:p-14')}>{copy}</div>
    </div>
  )
}

function Heading(block: BlockNode, context: BlockContext) {
  const level = (text(block.props, 'level') || 'h2') as keyof typeof HEADING_BASE
  const Tag = (level === 'h1' ? 'h1' : level === 'h3' ? 'h3' : level === 'h4' ? 'h4' : 'h2') as 'h2'
  const value = text(block.props, 'text')

  if (!value) return <Placeholder label="Heading" editing={context.editing} />

  // An h1 is display type and goes through the template's display scale; the
  // rest go through the ordinary one. That split is what lets a poster
  // template blow the headline up without inflating every section title with
  // it, and it is most of the difference between "editorial" and "big".
  const display = level === 'h1'
  const base = HEADING_BASE[level] ?? HEADING_BASE.h2
  const weight = { regular: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold' }[
    text(block.props, 'weight') || 'semibold'
  ]
  const tone = text(block.props, 'tone')

  return (
    <Tag
      className={cx(
        weight ?? 'font-semibold',
        display ? 'shop-display' : 'shop-heading',
        alignClass(block.props),
        block.props.balance !== false && '[text-wrap:balance]',
      )}
      style={
        {
          [display ? '--shop-display-size' : '--shop-heading-size']: base,
          lineHeight: HEADING_LEADING[level] ?? 1.15,
          color: tone && tone !== 'text' ? toneColor(tone) : undefined,
        } as React.CSSProperties
      }
    >
      {value}
    </Tag>
  )
}

function Text(block: BlockNode, context: BlockContext) {
  const body = text(block.props, 'body')
  if (!body) return <Placeholder label="Text" editing={context.editing} />

  const size = (text(block.props, 'size') || 'md') as keyof typeof TEXT_SIZE
  const tone = text(block.props, 'tone') || 'soft'
  const reading = text(block.props, 'width') === 'reading'
  const centred = text(block.props, 'align') === 'center'
  return (
    <div
      className={cx(
        'space-y-3 leading-relaxed',
        tone === 'soft' && 'opacity-80',
        TEXT_SIZE[size] ?? TEXT_SIZE.md,
        alignClass(block.props),
        reading && 'max-w-[65ch]',
        reading && centred && 'mx-auto',
      )}
      style={tone !== 'soft' ? { color: toneColor(tone) } : undefined}
    >
      {/* Blank lines start a paragraph, single newlines are line breaks —
          both built from React nodes, never from HTML. The field is plain
          text by declaration, and `dangerouslySetInnerHTML` on merchant input
          is exactly the hole the sanitiser exists to close. */}
      {body.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>
          {paragraph.split('\n').map((line, lineIndex) => (
            <span key={lineIndex}>
              {lineIndex > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

function ButtonBlock(block: BlockNode, context: BlockContext) {
  const label = text(block.props, 'label')
  if (!label) return <Placeholder label="Button" editing={context.editing} />

  const style = text(block.props, 'style') || 'primary'
  const align = text(block.props, 'align')

  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--shop-primary)', color: 'var(--shop-bg)' },
    accent: { background: 'var(--shop-accent)', color: 'var(--shop-bg)' },
    outline: { border: '1px solid currentColor' },
    soft: { background: 'var(--shop-surface)', color: 'var(--shop-text)' },
    link: { color: 'var(--shop-accent-on, var(--shop-accent))', textDecoration: 'underline', padding: 0 },
  }
  const size = text(block.props, 'size') || 'md'
  const padding = { sm: 'px-4 py-2 text-[13px]', md: 'px-6 py-3 text-[14px]', lg: 'px-8 py-4 text-[15.5px]' }[size]

  return (
    <div className={alignClass({ align })}>
      <ShopLink
        href={text(block.props, 'url') || '/products'}
        className={cx(
          'inline-flex items-center justify-center gap-2 font-medium transition hover:opacity-80',
          style !== 'link' ? padding : 'text-[14px]',
          flag(block.props, 'full_width') && style !== 'link' && 'w-full',
        )}
        style={{ ...(styles[style] ?? styles.primary), borderRadius: style === 'link' ? 0 : 'var(--shop-radius)' }}
      >
        {label}
        {flag(block.props, 'arrow') && <span aria-hidden>→</span>}
      </ShopLink>
    </div>
  )
}

function ValueProps(block: BlockNode, context: BlockContext) {
  const items = (block.props.items as { title: string; body: string }[] | undefined) ?? []
  if (items.length === 0) return <Placeholder label="Value propositions — add some" editing={context.editing} />

  return (
    <div className="grid gap-8 sm:grid-cols-3">
      {items.map((item, index) => (
        <div key={index}>
          <h3 className="text-[15px] font-medium">{item.title}</h3>
          {item.body && <p className="mt-1.5 text-[14px] leading-relaxed opacity-70">{item.body}</p>}
        </div>
      ))}
    </div>
  )
}

function Testimonial(block: BlockNode, context: BlockContext) {
  const quote = text(block.props, 'quote')
  if (!quote) return <Placeholder label="Testimonial" editing={context.editing} />

  return (
    <figure className="mx-auto max-w-2xl text-center">
      <blockquote className="text-[20px] leading-relaxed" style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}>
        “{quote}”
      </blockquote>
      <figcaption className="mt-5 flex items-center justify-center gap-3 text-[13px] opacity-70">
        {text(block.props, 'avatar') && (
          <img src={text(block.props, 'avatar')} alt="" className="h-9 w-9 rounded-full object-cover" />
        )}
        <span>
          {text(block.props, 'author')}
          {text(block.props, 'role') && <span className="opacity-60"> · {text(block.props, 'role')}</span>}
        </span>
      </figcaption>
    </figure>
  )
}

function Faq(block: BlockNode, context: BlockContext) {
  const items = (block.props.items as { question: string; answer: string }[] | undefined) ?? []
  if (items.length === 0) return <Placeholder label="Questions — add some" editing={context.editing} />

  return (
    <div className="mx-auto max-w-2xl divide-y" style={{ borderColor: 'var(--shop-line)' }}>
      {items.map((item, index) => (
        // `<details>` rather than JavaScript state: it works before hydration,
        // it is keyboard accessible for free, and search engines read it.
        <details key={index} className="group py-4">
          <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-medium">
            {item.question}
            <span className="shrink-0 opacity-40 transition group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="mt-3 text-[14px] leading-relaxed opacity-70">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}

function Newsletter(block: BlockNode) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <h2 className="text-[22px] font-semibold tracking-[-0.015em]">
        {text(block.props, 'heading') || 'Stay in touch'}
      </h2>
      {text(block.props, 'body') && (
        <p className="mt-2 text-[15px] opacity-70">{text(block.props, 'body')}</p>
      )}
      <form className="mt-5 flex gap-2" onSubmit={(event) => event.preventDefault()}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          className="min-w-0 flex-1 border px-4 py-3 text-[15px] outline-none"
          style={{
            background: 'var(--shop-bg)',
            borderColor: 'var(--shop-line)',
            borderRadius: 'var(--shop-radius)',
            color: 'var(--shop-text)',
          }}
        />
        <button
          type="submit"
          className="px-5 py-3 text-[14px] font-medium"
          style={{
            background: 'var(--shop-primary)',
            color: 'var(--shop-bg)',
            borderRadius: 'var(--shop-radius)',
          }}
        >
          {text(block.props, 'button_label') || 'Subscribe'}
        </button>
      </form>
    </div>
  )
}

/* -- media -------------------------------------------------------------- */

function ImageBlock(block: BlockNode, context: BlockContext) {
  const src = text(block.props, 'src')
  const shape = (text(block.props, 'ratio') || 'auto') as keyof typeof RATIOS

  if (!src) {
    return (
      <ImageSlot
        ratio={RATIOS[shape]}
        rounded={flag(block.props, 'rounded')}
        editing={context.editing}
      />
    )
  }

  const ratio = shape
  const image = (
    <img
      src={src}
      alt={text(block.props, 'alt')}
      loading="lazy"
      className={cx('w-full', text(block.props, 'fit') === 'contain' ? 'object-contain' : 'object-cover', RATIOS[ratio])}
      style={{ borderRadius: flag(block.props, 'rounded') ? 'var(--shop-radius)' : 0 }}
    />
  )

  const href = text(block.props, 'url')
  const linked = href ? <ShopLink href={href}>{image}</ShopLink> : image
  const caption = text(block.props, 'caption')
  if (!caption) return linked
  return (
    <figure>
      {linked}
      <figcaption className="mt-2 text-[13px]" style={{ color: 'var(--shop-muted)' }}>{caption}</figcaption>
    </figure>
  )
}

function Video(block: BlockNode, context: BlockContext) {
  const url = text(block.props, 'url')
  const embed = toEmbed(url)
  if (!embed) return <Placeholder label="Video — paste a YouTube or Vimeo link" editing={context.editing} />

  return (
    <figure>
      <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: 'var(--shop-radius)' }}>
        <iframe
          src={embed}
          title={text(block.props, 'caption') || 'Video'}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {text(block.props, 'caption') && (
        <figcaption className="mt-2 text-center text-[13px] opacity-60">
          {text(block.props, 'caption')}
        </figcaption>
      )}
    </figure>
  )
}

/**
 * A watch URL turned into an embed URL.
 *
 * Only YouTube and Vimeo. An arbitrary URL in an `<iframe>` is a frame that can
 * do whatever the embedded origin wants, so the allowed set is a list rather
 * than a pattern.
 */
function toEmbed(url: string): string | null {
  if (!url) return null
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

/* -- commerce ----------------------------------------------------------- */

function ProductGrid(block: BlockNode, context: BlockContext) {
  const limit = num(block.props, 'limit', 4)
  const columns = num(block.props, 'columns', 4)
  const collectionId = text(block.props, 'collection')

  // A named collection resolves to its own list; anything else falls back to
  // the store's best sellers, which is what `products` holds.
  const source = collectionId
    ? (context.productsByCollection?.[collectionId] ?? context.products)
    : context.products
  const products = source.slice(0, limit)

  return (
    <div>
      {text(block.props, 'heading') && (
        <h2
          className="mb-7 text-[24px] font-semibold tracking-[-0.02em]"
          style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
        >
          {text(block.props, 'heading')}
        </h2>
      )}

      {products.length === 0 ? (
        <Placeholder
          label="No products yet — add some and they will appear here"
          editing={context.editing}
        />
      ) : (
        <div
          className="grid grid-cols-2 gap-x-5 gap-y-9"
          style={{ gridTemplateColumns: undefined }}
          data-columns={columns}
        >
          {products.map((product) => (
            <ShopLink key={product.id} href={`/products/${product.slug}`} className="group block">
              <div
                className="aspect-[4/5] w-full overflow-hidden"
                style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <p className="mt-3 text-[14px] leading-snug">{product.title}</p>
              {flag(block.props, 'show_price') && (
                <p className="mt-1 text-[14px] font-medium">
                  {product.price.formatted}
                  {product.compare_at && (
                    <span className="ml-2 text-[13px] line-through opacity-45">
                      {product.compare_at.formatted}
                    </span>
                  )}
                </p>
              )}
            </ShopLink>
          ))}
        </div>
      )}

      {/* The column count is a prop rather than a class so Tailwind's scanner
          cannot miss it — `grid-cols-${n}` would be built out of the CSS. */}
      <style>{`
        @media (min-width: 768px) {
          [data-columns="${columns}"] { grid-template-columns: repeat(${columns}, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  )
}

function FeaturedProduct(block: BlockNode, context: BlockContext) {
  const productId = text(block.props, 'product')
  const product = context.products.find((entry) => String(entry.id) === productId) ?? context.products[0]

  if (!product) return <Placeholder label="Featured product — choose one" editing={context.editing} />

  const stacked = text(block.props, 'layout') === 'stacked'

  return (
    <div className={cx('grid items-center gap-8', !stacked && 'lg:grid-cols-2')}>
      <div
        className="aspect-square w-full overflow-hidden"
        style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}
      >
        {product.image_url && (
          <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
        )}
      </div>
      <div>
        {text(block.props, 'eyebrow') && (
          <p className="text-[12px] uppercase tracking-[0.08em] opacity-55">
            {text(block.props, 'eyebrow')}
          </p>
        )}
        <h2
          className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]"
          style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
        >
          {product.title}
        </h2>
        {product.summary && <p className="mt-3 text-[15px] leading-relaxed opacity-70">{product.summary}</p>}
        <p className="mt-4 text-[20px] font-medium">{product.price.formatted}</p>
        <ShopLink
          href={`/products/${product.slug}`}
          className="mt-6 inline-flex items-center px-6 py-3 text-[14px] font-medium"
          style={{
            background: 'var(--shop-primary)',
            color: 'var(--shop-bg)',
            borderRadius: 'var(--shop-radius)',
          }}
        >
          {product.available ? 'View product' : 'Sold out'}
        </ShopLink>
      </div>
    </div>
  )
}

function CollectionList(block: BlockNode, context: BlockContext) {
  const limit = num(block.props, 'limit', 3)
  const collections = context.collections.slice(0, limit)

  if (collections.length === 0) {
    return <Placeholder label="No collections yet — create some first" editing={context.editing} />
  }

  return (
    <div>
      {text(block.props, 'heading') && (
        <h2
          className="mb-7 text-[24px] font-semibold tracking-[-0.02em]"
          style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
        >
          {text(block.props, 'heading')}
        </h2>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <ShopLink
            key={collection.id}
            href={`/collections/${collection.slug}`}
            className="group relative block aspect-[16/10] overflow-hidden"
            style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}
          >
            {collection.image_url && (
              <img
                src={collection.image_url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            )}
            <div
              className="absolute inset-x-0 bottom-0 p-4"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }}
            >
              <p className="text-[16px] font-medium text-white">{collection.title}</p>
            </div>
          </ShopLink>
        ))}
      </div>
    </div>
  )
}

const BAR_HEIGHT = { auto: '', compact: 'min-h-12', regular: 'min-h-16', tall: 'min-h-20' } as const

/** A header the merchant fills: a flex row (or column) of any blocks. */
function HeaderBar(block: BlockNode, context: BlockContext) {
  const { props } = block
  const chrome = barChrome(props)
  const column = text(props, 'direction') === 'column'
  const sticky = props.sticky === undefined ? true : flag(props, 'sticky')
  const inner = (
    <div
      className={cx(
        chrome.inner,
        'flex w-full',
        column ? 'flex-col py-3' : 'flex-row',
        props.wrap === true ? 'flex-wrap' : 'flex-nowrap',
        FLEX_GAP[(text(props, 'gap') || 'md') as keyof typeof FLEX_GAP],
        JUSTIFY[(text(props, 'justify') || 'between') as keyof typeof JUSTIFY],
        column
          ? { start: 'items-start', center: 'items-center', end: 'items-end' }[text(props, 'valign') || 'center'] ?? 'items-center'
          : ITEMS[(text(props, 'valign') || 'center') as keyof typeof ITEMS],
        BAR_HEIGHT[(text(props, 'height') || 'regular') as keyof typeof BAR_HEIGHT],
      )}
    >
      <Empty block={block} context={context} label="Header bar — drop a logo, links, search or cart in" />
    </div>
  )
  const position = sticky ? 'sticky top-0 z-30' : 'relative z-30'
  if (chrome.floating) {
    return (
      <header className={cx(position, 'px-3 pt-3')}>
        <div className={cx('mx-auto max-w-6xl overflow-visible', chrome.className)} style={chrome.style}>
          {inner}
        </div>
      </header>
    )
  }
  return (
    <header className={cx(position, chrome.className)} style={chrome.style}>
      {inner}
    </header>
  )
}

function Announcement(block: BlockNode) {
  const message = text(block.props, 'text')
  if (!message) return null

  const background = text(block.props, 'background') || 'var(--shop-primary)'
  const inner = (
    <div className="px-4 py-2.5 text-center text-[13px]" style={{ background, color: 'var(--shop-bg)' }}>
      {message}
    </div>
  )
  const href = text(block.props, 'url')
  return href ? <ShopLink href={href}>{inner}</ShopLink> : inner
}

/* -- shared ------------------------------------------------------------- */

/**
 * A link that navigates on the shop and does nothing on the canvas.
 *
 * Without this, clicking a hero's button in the builder would navigate the
 * merchant away from the page they are editing — losing unsaved work to what
 * felt like an ordinary click.
 */
function ShopLink({
  href,
  children,
  className,
  style,
}: {
  href: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const external = /^https?:\/\//i.test(href)
  if (external) {
    return (
      <a href={href} className={className} style={style} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  )
}

type Renderer = (block: BlockNode, context: BlockContext) => ReactNode

/* -- the composed-layout blocks ----------------------------------------- */

function Eyebrow(block: BlockNode) {
  const value = text(block.props, 'text')
  if (!value) return null
  return (
    <p
      className={cx(
        'text-[11.5px] font-semibold uppercase tracking-[0.14em]',
        text(block.props, 'align') === 'center' && 'text-center',
      )}
      // Falls back to the theme's accent everywhere except inside a section
      // that has forced light text over a photograph — see `Section`.
      style={{ color: 'var(--shop-accent-on, var(--shop-accent))' }}
    >
      {value}
    </p>
  )
}

function Stats(block: BlockNode, context: BlockContext) {
  const items = (block.props.items as { value?: string; label?: string }[]) ?? []
  if (items.length === 0) {
    return <Placeholder label="Numbers — add a figure" editing={context.editing} />
  }
  const centred = text(block.props, 'align') !== 'left'

  return (
    <dl
      className={cx(
        'grid gap-6 sm:grid-cols-2',
        items.length >= 3 && 'lg:grid-cols-' + Math.min(items.length, 4),
      )}
    >
      {items.map((item, index) => (
        <div key={index} className={centred ? 'text-center' : ''}>
          {/* Tabular figures, so a row of numbers lines up rather than
              wobbling on the width of a 1. */}
          <dd
            className="text-[30px] font-semibold leading-none [font-variant-numeric:tabular-nums]"
            style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
          >
            {item.value}
          </dd>
          <dt className="mt-1.5 text-[13px]" style={{ color: 'var(--shop-muted)' }}>
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  )
}

function Logos(block: BlockNode, context: BlockContext) {
  const items = (block.props.items as { name?: string; image?: string }[]) ?? []
  const heading = text(block.props, 'heading')
  if (items.length === 0) {
    return <Placeholder label="Logo row — add a name or an image" editing={context.editing} />
  }

  return (
    <div className="w-full">
      {heading && (
        <p
          className="mb-4 text-center text-[11.5px] uppercase tracking-[0.12em]"
          style={{ color: 'var(--shop-muted)' }}
        >
          {heading}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
        {items.map((item, index) =>
          item.image ? (
            <img
              key={index}
              src={item.image}
              alt={item.name ?? ''}
              // Greyed back so a row of mismatched logos reads as one row
              // rather than as five competing brands.
              className="h-6 w-auto opacity-55 grayscale transition hover:opacity-90 hover:grayscale-0"
            />
          ) : (
            <span
              key={index}
              className="text-[14px] font-medium tracking-tight opacity-60"
              style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
            >
              {item.name}
            </span>
          ),
        )}
      </div>
    </div>
  )
}

/** The small glyphs a feature block can carry. Drawn, not imported: the shop
 *  must not pull an icon font for four strokes. */
const FEATURE_ICONS: Record<string, string> = {
  check: 'M3.5 8.5l3 3 6-6.5',
  truck: 'M1.5 4.5h8v7h-8zM9.5 7h3l2 2.5v2h-5zM4 13.5a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4zM11.5 13.5a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z',
  refund: 'M13.5 8a5.5 5.5 0 11-1.9-4.1M13 1.5v3h-3',
  shield: 'M8 1.5l5 2v4c0 3-2.2 5.6-5 7-2.8-1.4-5-4-5-7v-4z',
  leaf: 'M13.5 2.5C7 2.5 3 5.5 3 10a4 4 0 004 4c4.5 0 6.5-4.5 6.5-11.5zM7 12c1.5-3 3.5-5 6-6.5',
  star: 'M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.6l-3.8 2 .7-4.2-3.1-3 4.3-.6z',
  clock: 'M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM8 5v3.2l2.2 1.3',
  globe: 'M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM2.5 8h11M8 2.5c1.6 1.6 2.4 3.5 2.4 5.5S9.6 12.4 8 13.5C6.4 12.4 5.6 10 5.6 8S6.4 4.1 8 2.5z',
  heart: 'M8 13.5S2 10 2 6a3 3 0 016-1 3 3 0 016 1c0 4-6 7.5-6 7.5z',
  gift: 'M2 6h12v3H2zM3 9h10v5H3zM8 6v8M8 6C6 6 4.5 5 5 3.5S8 4 8 6zM8 6c2 0 3.5-1 3-2.5S8 4 8 6z',
  mail: 'M2 4h12v8H2zM2 4.5l6 4.5 6-4.5',
  phone: 'M3 2.5h3l1.2 3-1.7 1a7 7 0 003.5 3.5l1-1.7 3 1.2v3a1 1 0 01-1 1A10.5 10.5 0 012 3.5a1 1 0 011-1z',
  pin: 'M8 14s-4.5-4.2-4.5-7.5a4.5 4.5 0 019 0C12.5 9.8 8 14 8 14zM8 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  lock: 'M3.5 7h9v6.5h-9zM5.5 7V5a2.5 2.5 0 015 0v2',
  sparkle: 'M8 1.5l1.4 4.1L13.5 7l-4.1 1.4L8 12.5 6.6 8.4 2.5 7l4.1-1.4zM13 11.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z',
  arrow: 'M2.5 8h11M9.5 4l4 4-4 4',
}

function IconFeature(block: BlockNode) {
  const path = FEATURE_ICONS[text(block.props, 'icon')] ?? FEATURE_ICONS.check
  const centred = text(block.props, 'align') === 'center'

  return (
    <div className={centred ? 'text-center' : ''}>
      <span
        className={cx(
          'inline-flex h-9 w-9 items-center justify-center rounded-full',
          centred && 'mx-auto',
        )}
        style={{ background: 'var(--shop-surface)', color: 'var(--shop-accent)' }}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor"
             strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={path} />
        </svg>
      </span>
      <h3
        className="mt-3 text-[15px] font-semibold"
        style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
      >
        {text(block.props, 'title')}
      </h3>
      <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--shop-muted)' }}>
        {text(block.props, 'body')}
      </p>
    </div>
  )
}

function Gallery(block: BlockNode, context: BlockContext) {
  const items = (block.props.items as { image?: string; alt?: string }[]) ?? []
  if (items.length === 0) {
    return <Placeholder label="Gallery — add pictures" editing={context.editing} />
  }
  const columns = Math.min(Math.max(num(block.props, 'columns', 3), 2), 4)
  const ratio = RATIOS[(text(block.props, 'ratio') || 'square') as keyof typeof RATIOS]

  return (
    <div
      className="grid w-full grid-cols-2 gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, index) => (
        <figure key={index} className="w-full">
          {item.image ? (
            <div
              className={cx('overflow-hidden', ratio)}
              style={{ borderRadius: 'var(--shop-radius)', background: 'var(--shop-surface)' }}
            >
              <img
                src={item.image}
                alt={item.alt ?? ''}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <ImageSlot ratio={ratio} label="" editing={context.editing} />
          )}
        </figure>
      ))}
    </div>
  )
}

function SplitBanner(block: BlockNode, context: BlockContext) {
  const items = (block.props.items as {
    image?: string; eyebrow?: string; title?: string; label?: string; url?: string
  }[]) ?? []
  if (items.length === 0) {
    return <Placeholder label="Split banner — add two panels" editing={context.editing} />
  }
  const height = { sm: 'min-h-[16rem]', md: 'min-h-[22rem]', lg: 'min-h-[30rem]' }[
    text(block.props, 'height') || 'md'
  ]

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {items.slice(0, 3).map((item, index) => (
        <ShopLink key={index} href={item.url || '/products'}>
          <div
            className={cx(
              'group relative flex items-end overflow-hidden p-6 transition',
              height,
            )}
            style={{
              borderRadius: 'var(--shop-radius)',
              background: item.image ? undefined : 'var(--shop-surface)',
              backgroundImage: item.image ? `url(${item.image})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* A gradient rather than a flat scrim: the text sits at the
                bottom, so only the bottom needs darkening, and the picture
                stays a picture. */}
            {item.image && (
              <span
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05) 60%)' }}
                aria-hidden
              />
            )}
            <div className="relative" style={{ color: item.image ? '#fff' : 'var(--shop-text)' }}>
              {item.eyebrow && (
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                  {item.eyebrow}
                </div>
              )}
              <div
                className="mt-1 text-[22px] font-semibold leading-tight"
                style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
              >
                {item.title}
              </div>
              {item.label && (
                <div className="mt-2 inline-block border-b border-current pb-0.5 text-[13px]">
                  {item.label}
                </div>
              )}
            </div>
          </div>
        </ShopLink>
      ))}
    </div>
  )
}

function Editorial(block: BlockNode, context: BlockContext) {
  const image = text(block.props, 'image')
  const left = text(block.props, 'side') !== 'right'

  return (
    <div className="relative w-full">
      {image ? (
        <div
          className="aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]"
          style={{ borderRadius: 'var(--shop-radius)' }}
        >
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : (
        <ImageSlot ratio="aspect-[21/9]" editing={context.editing} />
      )}

      {/* Overlapping on a wide screen, stacked underneath on a narrow one.
          A card half off the bottom of a photograph is the whole effect, and
          on a phone it is just a card that covers the picture. */}
      <div
        className={cx(
          'relative mx-4 -mt-10 max-w-md p-6 sm:absolute sm:bottom-8 sm:mt-0',
          left ? 'sm:left-8' : 'sm:right-8',
        )}
        style={{
          background: 'var(--shop-bg)',
          borderRadius: 'var(--shop-radius)',
          border: '1px solid var(--shop-line)',
        }}
      >
        {text(block.props, 'eyebrow') && (
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--shop-accent-on, var(--shop-accent))' }}
          >
            {text(block.props, 'eyebrow')}
          </div>
        )}
        <h3
          className="mt-1.5 text-[22px] font-semibold leading-tight"
          style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
        >
          {text(block.props, 'heading')}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--shop-muted)' }}>
          {text(block.props, 'body')}
        </p>
        {text(block.props, 'cta_label') && (
          <ShopLink href={text(block.props, 'cta_url') || '/products'}>
            <span className="mt-3 inline-block border-b border-current pb-0.5 text-[13px] font-medium">
              {text(block.props, 'cta_label')}
            </span>
          </ShopLink>
        )}
      </div>
    </div>
  )
}

function Steps(block: BlockNode, context: BlockContext) {
  const items = (block.props.items as { title?: string; body?: string }[]) ?? []
  if (items.length === 0) {
    return <Placeholder label="Steps — add the first one" editing={context.editing} />
  }
  const across = text(block.props, 'layout') !== 'stack'

  return (
    <div className="w-full">
      {text(block.props, 'heading') && (
        <h2
          className="mb-6 text-[26px] font-semibold sm:text-[32px]"
          style={{ fontFamily: 'var(--shop-heading-font, inherit)' }}
        >
          {text(block.props, 'heading')}
        </h2>
      )}
      <ol
        className={cx('grid gap-6', across ? 'sm:grid-cols-3' : 'max-w-2xl')}
        style={across ? { gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0,1fr))` } : undefined}
      >
        {items.map((item, index) => (
          <li key={index} className={across ? '' : 'flex gap-4'}>
            {/* The number is the design. A step list without visible ordinals
                is three paragraphs that happen to be near each other. */}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold [font-variant-numeric:tabular-nums]"
              style={{ background: 'var(--shop-surface)', color: 'var(--shop-accent)' }}
            >
              {index + 1}
            </span>
            <div className={across ? 'mt-3' : ''}>
              <h3 className="text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--shop-muted)' }}>
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Marquee(block: BlockNode, context: BlockContext) {
  const items = ((block.props.items as { text?: string }[]) ?? [])
    .map((item) => item.text)
    .filter(Boolean)
  if (items.length === 0) {
    return <Placeholder label="Marquee — add a phrase" editing={context.editing} />
  }
  const seconds = { slow: 45, medium: 28, fast: 16 }[text(block.props, 'speed') || 'slow'] ?? 45
  const background = text(block.props, 'background')

  // Twice, so the loop has something to scroll into. One copy reaching the end
  // leaves a gap the width of the screen.
  const run = [...items, ...items]

  return (
    <div
      className="relative w-full overflow-hidden py-3"
      style={{ background: background || 'var(--shop-surface)' }}
    >
      <div
        className="flex w-max gap-10 whitespace-nowrap motion-reduce:animate-none"
        style={{ animation: `shop-marquee ${seconds}s linear infinite` }}
      >
        {run.map((phrase, index) => (
          <span
            key={index}
            className="text-[12.5px] font-medium uppercase tracking-[0.16em]"
            style={{ color: 'var(--shop-muted)' }}
          >
            {phrase}
          </span>
        ))}
      </div>
      {/* Declared inline: the storefront has no stylesheet of ours to put a
          keyframe in, and one block should not require one. */}
      <style>{`@keyframes shop-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}

/* -- primitives ---------------------------------------------------------- */
/*
 * The small, composable blocks. Containers draw their children through
 * `Children`, so on the canvas every child is its own selectable block. Tables
 * and lists keep their content as a field instead — edited as a spreadsheet
 * and as a list of points in the settings panel — because a cell or a bullet
 * that has to be found and clicked on the canvas one at a time is content a
 * merchant never manages to add.
 */

const BOX_PADDING = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-8', xl: 'p-10 sm:p-14' }
const BOX_HEIGHT = { auto: '', sm: 'min-h-[12rem]', md: 'min-h-[20rem]', lg: 'min-h-[30rem]' }
const BOX_WIDTH = { none: '', sm: '24rem', md: '36rem', lg: '52rem' }
const FLEX_GAP = { none: 'gap-0', sm: 'gap-2', md: 'gap-4', lg: 'gap-8' }
const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around' }
const ITEMS = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }
const SIZE_TEXT = { sm: 'text-[13.5px]', md: 'text-[15px]', lg: 'text-[17.5px]' }

/** A colour choice shared by several primitives. */
function toneColor(tone: string, fallback = 'var(--shop-text)') {
  if (tone === 'accent') return 'var(--shop-accent-on, var(--shop-accent))'
  if (tone === 'muted') return 'var(--shop-muted)'
  if (tone === 'text') return 'var(--shop-text)'
  return fallback
}

function alignClass(props: Record<string, unknown>) {
  const align = text(props, 'align')
  return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : undefined
}

function justifyClass(props: Record<string, unknown>) {
  const align = text(props, 'align')
  return align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
}

/** Only an explicit `false` turns off a flag whose default is on. */
const on = (props: Record<string, unknown>, key: string) => props[key] !== false

/** An empty container on the canvas: somewhere to drop, saying what it is. */
function Empty({ block, context, label }: { block: BlockNode; context: BlockContext; label: string }) {
  if (block.children.length === 0 && !context.renderChildren) {
    return <Placeholder label={label} editing={context.editing} />
  }
  return <Children block={block} context={context} />
}

function Box(block: BlockNode, context: BlockContext) {
  const { props } = block
  const image = text(props, 'background_image')
  const background = text(props, 'background')
  const overlay = image && on(props, 'overlay')
  const textColor = text(props, 'text_color')
  const radius = text(props, 'radius') || 'theme'
  const centred = text(props, 'align') === 'center'
  const shadow = text(props, 'shadow')
  const href = text(props, 'url')
  const width = BOX_WIDTH[(text(props, 'max_width') || 'none') as keyof typeof BOX_WIDTH]
  const valign = text(props, 'valign')

  const style: React.CSSProperties = {
    borderRadius: radius === 'none' ? 0 : radius === 'lg' ? '1.25rem' : 'var(--shop-radius)',
  }
  if (width) {
    style.maxWidth = width
    if (centred) style.marginInline = 'auto'
  }
  if (background) style.background = background
  if (flag(props, 'border')) style.border = '1px solid var(--shop-line)'
  if (shadow === 'sm') style.boxShadow = '0 1px 2px rgba(0,0,0,.05), 0 4px 14px -4px rgba(0,0,0,.08)'
  if (shadow === 'lg') style.boxShadow = '0 2px 4px rgba(0,0,0,.04), 0 18px 40px -12px rgba(0,0,0,.2)'
  if (image) {
    style.backgroundImage = `url(${image})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  }
  if (textColor) style.color = textColor
  else if (overlay || (background && isDark(background))) style.color = '#ffffff'

  const box = (
    <div
      className={cx(
        'relative flex w-full flex-col overflow-hidden',
        BOX_PADDING[(text(props, 'padding') || 'md') as keyof typeof BOX_PADDING],
        BOX_HEIGHT[(text(props, 'min_height') || 'auto') as keyof typeof BOX_HEIGHT],
        valign === 'center' && 'justify-center',
        valign === 'bottom' && 'justify-end',
        centred && 'items-center text-center',
        flag(props, 'hover') && 'transition duration-200 hover:-translate-y-1',
      )}
      style={style}
    >
      {overlay && <span className="absolute inset-0 bg-black/40" aria-hidden />}
      <div className={cx('relative flex w-full flex-col', FLEX_GAP[(text(props, 'gap') || 'md') as keyof typeof FLEX_GAP], centred && 'items-center')}>
        <Empty block={block} context={context} label="Box — drag blocks in" />
      </div>
    </div>
  )
  return href && !context.editing ? <ShopLink href={href} className="block">{box}</ShopLink> : box
}

function Row(block: BlockNode, context: BlockContext) {
  const { props } = block
  return (
    <div
      className={cx(
        'flex',
        flag(props, 'stack') ? 'flex-col sm:flex-row' : 'flex-row',
        props.wrap === false ? 'flex-nowrap' : 'flex-wrap',
        FLEX_GAP[(text(props, 'gap') || 'md') as keyof typeof FLEX_GAP],
        JUSTIFY[(text(props, 'justify') || 'start') as keyof typeof JUSTIFY],
        ITEMS[(text(props, 'valign') || 'center') as keyof typeof ITEMS],
      )}
    >
      <Empty block={block} context={context} label="Row — drag blocks in, side by side" />
    </div>
  )
}

function Grid(block: BlockNode, context: BlockContext) {
  const columns = num(block.props, 'columns', 3)
  const tablet = num(block.props, 'tablet_columns', Math.min(columns, 2))
  const mobile = num(block.props, 'mobile_columns', 1)
  const selector = `[data-grid="${block.id}"]`
  return (
    <>
      <style>{`${selector}{grid-template-columns:repeat(${mobile},minmax(0,1fr))}@media (min-width:640px){${selector}{grid-template-columns:repeat(${tablet},minmax(0,1fr))}}@media (min-width:1024px){${selector}{grid-template-columns:repeat(${columns},minmax(0,1fr))}}`}</style>
      <div
        data-grid={block.id}
        className={cx(
          'grid',
          FLEX_GAP[(text(block.props, 'gap') || 'md') as keyof typeof FLEX_GAP],
          ITEMS[(text(block.props, 'valign') || 'stretch') as keyof typeof ITEMS],
        )}
      >
        <Empty block={block} context={context} label="Grid — drag blocks in" />
      </div>
    </>
  )
}

function Quote(block: BlockNode, context: BlockContext) {
  const value = text(block.props, 'text')
  if (!value) return <Placeholder label="Quote — write it in the settings" editing={context.editing} />
  const style = text(block.props, 'style') || 'bar'
  const cite = text(block.props, 'cite')
  const detail = text(block.props, 'cite_detail')
  const size = text(block.props, 'size') || 'md'
  const centred = text(block.props, 'align') === 'center'
  const quoteSize =
    style === 'large'
      ? { sm: 'text-[19px]', md: 'text-[23px] sm:text-[27px]', lg: 'text-[28px] sm:text-[34px]' }[size]
      : { sm: 'text-[15px]', md: 'text-[17px]', lg: 'text-[20px]' }[size]
  return (
    <figure
      className={cx(centred && 'mx-auto text-center', style === 'large' && 'max-w-3xl', style === 'boxed' && 'px-6 py-5')}
      style={style === 'boxed' ? { background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' } : undefined}
    >
      <blockquote
        className={cx('leading-relaxed', quoteSize, style === 'bar' && 'border-l-2 pl-5', style === 'bar' && centred && 'inline-block text-left')}
        style={{
          borderColor: 'var(--shop-accent)',
          fontFamily: style === 'large' ? 'var(--shop-heading-font, inherit)' : undefined,
        }}
      >
        {style === 'large' ? `“${value}”` : value}
      </blockquote>
      {(cite || detail) && (
        <figcaption className={cx('mt-3 text-[13.5px]', style === 'bar' && !centred && 'pl-5')}>
          {cite && <span className="font-medium">— {cite}</span>}
          {detail && <span style={{ color: 'var(--shop-muted)' }}>{cite ? ', ' : ''}{detail}</span>}
        </figcaption>
      )}
    </figure>
  )
}

function LinkBlock(block: BlockNode, context: BlockContext) {
  const label = text(block.props, 'label')
  if (!label) return <Placeholder label="Link" editing={context.editing} />
  const underline = text(block.props, 'underline') || 'hover'
  return (
    <div className={alignClass(block.props)}>
      <ShopLink
        href={text(block.props, 'url') || '/'}
        className={cx(
          'group inline-flex items-center gap-1.5 font-medium underline-offset-4',
          SIZE_TEXT[(text(block.props, 'size') || 'md') as keyof typeof SIZE_TEXT],
          underline === 'always' && 'underline',
          underline === 'hover' && 'hover:underline',
        )}
        style={{ color: toneColor(text(block.props, 'tone') || 'accent') }}
      >
        {label}
        {block.props.arrow !== false && (
          <span className="transition group-hover:translate-x-0.5" aria-hidden>→</span>
        )}
      </ShopLink>
    </div>
  )
}

const BADGE_TONES: Record<string, React.CSSProperties> = {
  accent: { background: 'var(--shop-accent)', color: 'var(--shop-bg)' },
  primary: { background: 'var(--shop-primary)', color: 'var(--shop-bg)' },
  soft: { background: 'var(--shop-surface)', color: 'var(--shop-text)' },
  outline: { border: '1px solid currentColor' },
  success: { background: '#dcfce7', color: '#166534' },
  warning: { background: '#fef3c7', color: '#92400e' },
  danger: { background: '#fee2e2', color: '#991b1b' },
}

function Badge(block: BlockNode, context: BlockContext) {
  const value = text(block.props, 'text')
  if (!value) return <Placeholder label="Badge" editing={context.editing} />
  const shape = text(block.props, 'shape') || 'pill'
  const large = text(block.props, 'size') === 'md'
  return (
    <div className={alignClass(block.props)}>
      <span
        className={cx(
          'inline-flex items-center font-semibold',
          large ? 'px-3 py-1 text-[13px]' : 'px-2.5 py-0.5 text-[11.5px]',
          on(block.props, 'uppercase') && 'uppercase tracking-[0.08em]',
          shape === 'pill' ? 'rounded-full' : shape === 'rounded' ? 'rounded-md' : 'rounded-none',
        )}
        style={BADGE_TONES[text(block.props, 'tone')] ?? BADGE_TONES.accent}
      >
        {value}
      </span>
    </div>
  )
}

function Code(block: BlockNode, context: BlockContext) {
  const value = text(block.props, 'code')
  if (!value) return <Placeholder label="Code" editing={context.editing} />
  const label = text(block.props, 'label')
  return (
    <figure>
      {label && (
        <figcaption className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--shop-muted)' }}>
          {label}
        </figcaption>
      )}
      <pre
        className={cx(
          'overflow-x-auto px-4 py-3 font-mono leading-relaxed',
          text(block.props, 'size') === 'sm' ? 'text-[12px]' : 'text-[13.5px]',
          on(block.props, 'wrap') && 'whitespace-pre-wrap break-words',
        )}
        style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}
      >
        <code>{value}</code>
      </pre>
    </figure>
  )
}

const MARKERS: Record<string, (index: number) => ReactNode> = {
  bullet: () => <span className="mt-[0.62em] block h-[0.36em] w-[0.36em] rounded-full bg-current" />,
  number: (index) => <span className="[font-variant-numeric:tabular-nums]">{index + 1}.</span>,
  check: () => (
    <svg viewBox="0 0 16 16" className="mt-[0.2em] h-[1.05em] w-[1.05em]" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  ),
  dash: () => <span>–</span>,
  arrow: () => <span>→</span>,
}

function List(block: BlockNode, context: BlockContext) {
  const items = ((block.props.items as { text?: string }[] | undefined) ?? []).filter((item) => item?.text)
  if (items.length === 0) return <Placeholder label="List — add points in the settings" editing={context.editing} />
  const marker = text(block.props, 'marker') || 'bullet'
  const columns = num(block.props, 'columns', 1)
  const spacing = { sm: 'gap-y-1', md: 'gap-y-2.5', lg: 'gap-y-4' }[text(block.props, 'spacing') || 'md'] ?? 'gap-y-2.5'
  const dividers = flag(block.props, 'dividers')
  const Tag = marker === 'number' ? 'ol' : 'ul'
  const draw = MARKERS[marker]

  return (
    <Tag
      className={cx(
        'grid gap-x-8',
        dividers ? 'gap-y-0' : spacing,
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        SIZE_TEXT[(text(block.props, 'size') || 'md') as keyof typeof SIZE_TEXT],
      )}
    >
      {items.map((item, index) => (
        <li
          key={index}
          className={cx('flex gap-3 leading-relaxed', dividers && 'border-b py-2.5')}
          style={dividers ? { borderColor: 'var(--shop-line)' } : undefined}
        >
          {draw && (
            <span className="flex w-[1.1em] shrink-0 justify-center" style={{ color: toneColor(text(block.props, 'marker_tone') || 'accent') }} aria-hidden>
              {draw(index)}
            </span>
          )}
          <span className="min-w-0">{item.text}</span>
        </li>
      ))}
    </Tag>
  )
}

const CALLOUT_TONES: Record<string, { tint: string; ink: string; icon: string }> = {
  neutral: { tint: 'var(--shop-surface)', ink: 'var(--shop-muted)', icon: 'M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM8 7.2v3.6M8 5.2v.1' },
  info: { tint: 'color-mix(in srgb, #2563eb 10%, var(--shop-bg))', ink: '#2563eb', icon: 'M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM8 7.2v3.6M8 5.2v.1' },
  success: { tint: 'color-mix(in srgb, #16a34a 11%, var(--shop-bg))', ink: '#16a34a', icon: 'M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM5.5 8.2l1.8 1.8 3.3-3.6' },
  warning: { tint: 'color-mix(in srgb, #d97706 13%, var(--shop-bg))', ink: '#d97706', icon: 'M8 2.2l6 10.6H2zM8 6.5v3M8 11.2v.1' },
  danger: { tint: 'color-mix(in srgb, #dc2626 11%, var(--shop-bg))', ink: '#dc2626', icon: 'M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM8 5v3.6M8 10.8v.1' },
}

function Callout(block: BlockNode, context: BlockContext) {
  const title = text(block.props, 'title')
  const body = text(block.props, 'body')
  if (!title && !body) return <Placeholder label="Callout" editing={context.editing} />
  const tone = CALLOUT_TONES[text(block.props, 'tone')] ?? CALLOUT_TONES.neutral
  const style = text(block.props, 'style') || 'soft'
  const linkLabel = text(block.props, 'link_label')
  return (
    <div
      className={cx('flex gap-3 px-5 py-4', style === 'bar' && 'border-l-[3px]')}
      role="note"
      style={{
        background: style === 'soft' ? tone.tint : style === 'bar' ? tone.tint : 'transparent',
        border: style === 'outline' ? `1px solid ${tone.ink}` : undefined,
        borderLeftColor: style === 'bar' ? tone.ink : undefined,
        borderRadius: style === 'bar' ? 0 : 'var(--shop-radius)',
      }}
    >
      {on(block.props, 'show_icon') && (
        <svg viewBox="0 0 16 16" className="mt-0.5 h-[18px] w-[18px] shrink-0" fill="none" stroke={tone.ink}
             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={tone.icon} />
        </svg>
      )}
      <div className="min-w-0">
        {title && <p className="text-[14.5px] font-semibold">{title}</p>}
        {body && <p className={cx('text-[14px] leading-relaxed opacity-80', title && 'mt-1')}>{body}</p>}
        {linkLabel && (
          <ShopLink href={text(block.props, 'link_url') || '/'} className="mt-2 inline-block text-[13.5px] font-medium underline underline-offset-4">
            {linkLabel}
          </ShopLink>
        )}
      </div>
    </div>
  )
}

function Accordion(block: BlockNode, context: BlockContext) {
  const title = text(block.props, 'title') || 'Untitled'
  const body = text(block.props, 'body')
  const style = text(block.props, 'style') || 'lines'
  const icon = text(block.props, 'icon') || 'plus'
  const background = text(block.props, 'background')
  const titleSize = { sm: 'text-[14.5px]', md: 'text-[16px]', lg: 'text-[19px]' }[text(block.props, 'title_size') || 'md']
  const hasChildren = block.children.length > 0 || Boolean(context.renderChildren)

  return (
    // Always open on the canvas: a closed one hides what is inside it, and a
    // block nobody can see is a block nobody can select.
    <details
      className={cx('group', style === 'lines' && 'border-b py-4', style === 'boxed' && 'px-5 py-4', style === 'plain' && 'py-2')}
      style={{
        borderColor: 'var(--shop-line)',
        background: style === 'boxed' ? background || 'var(--shop-surface)' : undefined,
        borderRadius: style === 'boxed' ? 'var(--shop-radius)' : undefined,
      }}
      open={context.editing || flag(block.props, 'open')}
    >
      <summary className={cx('flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden', titleSize)}>
        {title}
        {icon === 'plus' && (
          <span className="shrink-0 text-[1.2em] leading-none opacity-50 transition group-open:rotate-45" aria-hidden>+</span>
        )}
        {icon === 'chevron' && (
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 opacity-50 transition group-open:rotate-180" fill="none"
               stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6l4 4 4-4" />
          </svg>
        )}
      </summary>
      {(body || hasChildren) && (
        <div className="mt-3 flex flex-col gap-3">
          {body && (
            <div className="space-y-2 text-[14.5px] leading-relaxed opacity-80">
              {body.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          )}
          {hasChildren && <Children block={block} context={context} />}
        </div>
      )}
    </details>
  )
}

function Table(block: BlockNode, context: BlockContext) {
  const rows = ((block.props.rows as string[][] | undefined) ?? []).filter(Array.isArray)
  if (rows.length === 0) return <Placeholder label="Table — add cells in the settings" editing={context.editing} />

  const headerRow = on(block.props, 'header_row')
  const headerColumn = flag(block.props, 'header_column')
  const lines = text(block.props, 'lines') || 'rows'
  const striped = flag(block.props, 'striped')
  const headerStyle = text(block.props, 'header_style') || 'tinted'
  const outline = on(block.props, 'outline')
  const caption = text(block.props, 'caption')
  const align = text(block.props, 'align')
  const pad = { sm: 'px-3 py-1.5 text-[13px]', md: 'px-4 py-2.5 text-[14px]', lg: 'px-5 py-3.5 text-[15px]' }[
    text(block.props, 'size') || 'md'
  ]
  const head = headerRow ? rows[0] : null
  const body = headerRow ? rows.slice(1) : rows
  const line = '1px solid var(--shop-line)'

  const cellStyle = (rowIndex: number, columnIndex: number, isHead: boolean): React.CSSProperties => ({
    borderTop: !isHead && (lines === 'rows' || lines === 'all') && (rowIndex > 0 || head) ? line : undefined,
    borderLeft: lines === 'all' && columnIndex > 0 ? line : undefined,
    textAlign: (align === 'center' || align === 'right' ? align : 'left') as 'left',
  })

  return (
    <figure className="w-full">
      <div
        className="w-full overflow-x-auto"
        style={{ border: outline ? line : undefined, borderRadius: 'var(--shop-radius)' }}
      >
        <table className="w-full border-collapse">
          {head && (
            <thead>
              <tr
                style={
                  headerStyle === 'filled'
                    ? { background: 'var(--shop-primary)', color: 'var(--shop-bg)' }
                    : headerStyle === 'tinted'
                      ? { background: 'var(--shop-surface)' }
                      : undefined
                }
              >
                {head.map((cell, column) => (
                  <th key={column} scope="col" className={cx('font-semibold', pad)} style={cellStyle(0, column, true)}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((cells, row) => (
              <tr
                key={row}
                style={striped && row % 2 === 1 ? { background: 'color-mix(in srgb, var(--shop-surface) 70%, transparent)' } : undefined}
              >
                {cells.map((cell, column) =>
                  headerColumn && column === 0 ? (
                    <th key={column} scope="row" className={cx('font-semibold', pad)} style={cellStyle(row, column, false)}>
                      {cell}
                    </th>
                  ) : (
                    <td key={column} className={cx(pad, align === 'right' && '[font-variant-numeric:tabular-nums]')} style={cellStyle(row, column, false)}>
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="mt-2 text-[12.5px]" style={{ color: 'var(--shop-muted)' }}>{caption}</figcaption>
      )}
    </figure>
  )
}

const STAR = 'M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.6l-3.8 2 .7-4.2-3.1-3 4.3-.6z'

function Rating(block: BlockNode) {
  const value = Math.max(0, Math.min(5, num(block.props, 'value', 5)))
  const label = text(block.props, 'label')
  const tone = text(block.props, 'tone') || 'gold'
  const color = tone === 'gold' ? '#f5a524' : toneColor(tone)
  const star = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }[text(block.props, 'size') || 'md']
  return (
    <div className={cx('flex items-center gap-2', justifyClass(block.props))}>
      <span className="flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
        {[0, 1, 2, 3, 4].map((index) => (
          <svg key={index} viewBox="0 0 16 16" className={star} aria-hidden
               fill={index < value ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2"
               style={{ color, opacity: index < value ? 1 : 0.35 }}>
            <path d={STAR} strokeLinejoin="round" />
          </svg>
        ))}
      </span>
      {label && (
        <span className={SIZE_TEXT[(text(block.props, 'size') || 'md') as keyof typeof SIZE_TEXT]} style={{ color: 'var(--shop-muted)' }}>
          {label}
        </span>
      )}
    </div>
  )
}

function IconBlock(block: BlockNode) {
  const path = FEATURE_ICONS[text(block.props, 'icon')] ?? FEATURE_ICONS.star
  const size = text(block.props, 'size') || 'md'
  const box = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-16 w-16', xl: 'h-24 w-24' }[size] ?? 'h-11 w-11'
  const glyph = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7', xl: 'h-11 w-11' }[size] ?? 'h-5 w-5'
  const shape = text(block.props, 'shape') || 'circle'
  return (
    <div className={alignClass(block.props)}>
      <span
        className={cx('inline-flex items-center justify-center', shape !== 'none' && box, shape === 'circle' && 'rounded-full', shape === 'square' && 'rounded-xl')}
        style={{ background: shape !== 'none' ? 'var(--shop-surface)' : undefined, color: toneColor(text(block.props, 'tone') || 'accent') }}
      >
        <svg viewBox="0 0 16 16" className={glyph} fill="none" stroke="currentColor"
             strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={path} />
        </svg>
      </span>
    </div>
  )
}

function Avatar(block: BlockNode) {
  const src = text(block.props, 'src')
  const name = text(block.props, 'name')
  const subtitle = text(block.props, 'subtitle')
  const stacked = text(block.props, 'layout') === 'stacked'
  const size = { sm: 'h-9 w-9 text-[13px]', md: 'h-12 w-12 text-[15px]', lg: 'h-20 w-20 text-[22px]' }[
    text(block.props, 'size') || 'md'
  ] ?? 'h-12 w-12'
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const centred = text(block.props, 'align') === 'center'
  return (
    <div className={cx('flex gap-3', stacked ? 'flex-col' : 'items-center', centred && (stacked ? 'items-center text-center' : 'justify-center'))}>
      {src ? (
        <img src={src} alt="" className={cx('shrink-0 rounded-full object-cover', size)} />
      ) : (
        <span className={cx('flex shrink-0 items-center justify-center rounded-full font-semibold', size)}
              style={{ background: 'var(--shop-surface)' }}>
          {initials || '?'}
        </span>
      )}
      {(name || subtitle) && (
        <span className="min-w-0">
          {name && <span className="block text-[14.5px] font-medium">{name}</span>}
          {subtitle && <span className="block text-[13px]" style={{ color: 'var(--shop-muted)' }}>{subtitle}</span>}
        </span>
      )}
    </div>
  )
}

function Audio(block: BlockNode, context: BlockContext) {
  const url = text(block.props, 'url')
  if (!url) return <Placeholder label="Audio — paste a link to a sound file in the settings" editing={context.editing} />
  return (
    <figure>
      {text(block.props, 'title') && <p className="mb-2 text-[15px] font-medium">{text(block.props, 'title')}</p>}
      <audio controls preload="none" loop={flag(block.props, 'loop')} src={url} className="w-full" />
      {text(block.props, 'caption') && (
        <figcaption className="mt-2 text-[13px]" style={{ color: 'var(--shop-muted)' }}>{text(block.props, 'caption')}</figcaption>
      )}
    </figure>
  )
}

function MapBlock(block: BlockNode, context: BlockContext) {
  const address = text(block.props, 'address').trim()
  if (!address) return <Placeholder label="Map — add an address in the settings" editing={context.editing} />
  const height = { sm: 'h-56', md: 'h-80', lg: 'h-[28rem]' }[text(block.props, 'height') || 'md'] ?? 'h-80'
  const zoom = num(block.props, 'zoom', 15)
  return (
    <div className={cx('w-full overflow-hidden', height)} style={{ borderRadius: on(block.props, 'rounded') ? 'var(--shop-radius)' : 0 }}>
      <iframe
        title={`Map of ${address}`}
        // The address is encoded into a fixed Google Maps URL; the merchant
        // chooses a place, never the frame's origin.
        src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`}
        className={cx('h-full w-full border-0', context.editing && 'pointer-events-none')}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

function SocialLinks(block: BlockNode, context: BlockContext) {
  const items = ((block.props.items as { label?: string; url?: string }[]) ?? []).filter((item) => item.label)
  if (items.length === 0) return <Placeholder label="Social links — add one in the settings" editing={context.editing} />
  const style = text(block.props, 'style') || 'pill'
  const small = text(block.props, 'size') === 'sm'
  return (
    <div className={cx('flex flex-wrap gap-2', justifyClass(block.props))}>
      {items.map((item, index) => (
        <ShopLink
          key={index}
          href={item.url || '#'}
          className={cx(
            'font-medium transition hover:opacity-75',
            small ? 'text-[12.5px]' : 'text-[14px]',
            style === 'text' ? 'px-1 underline-offset-4 hover:underline' : cx('rounded-full', small ? 'px-3 py-1' : 'px-4 py-1.5'),
          )}
          style={
            style === 'pill'
              ? { border: '1px solid var(--shop-line)' }
              : style === 'solid'
                ? { background: 'var(--shop-primary)', color: 'var(--shop-bg)' }
                : undefined
          }
        >
          {item.label}
        </ShopLink>
      ))}
    </div>
  )
}

const RENDERERS: Record<string, Renderer> = {
  box: Box,
  row: Row,
  grid: Grid,
  quote: Quote,
  link: LinkBlock,
  badge: Badge,
  code: Code,
  list: List,
  callout: Callout,
  accordion: Accordion,
  table: Table,
  rating: Rating,
  icon: IconBlock,
  avatar: Avatar,
  audio: Audio,
  map: MapBlock,
  social_links: SocialLinks,
  section: Section,
  split_banner: SplitBanner,
  editorial: Editorial,
  steps: Steps,
  marquee: Marquee,
  eyebrow: Eyebrow,
  stats: Stats,
  logos: Logos,
  icon_feature: IconFeature,
  gallery: Gallery,
  columns: Columns,
  column: Column,
  spacer: Spacer,
  divider: Divider,
  hero: Hero,
  heading: Heading,
  text: Text,
  button: ButtonBlock,
  value_props: ValueProps,
  testimonial: Testimonial,
  faq: Faq,
  newsletter: Newsletter,
  image: ImageBlock,
  video: Video,
  product_grid: ProductGrid,
  featured_product: FeaturedProduct,
  collection_list: CollectionList,
  announcement: Announcement,
  navbar: renderNavbar,
  header_bar: HeaderBar,
  site_logo: renderSiteLogo,
  nav_links: renderNavLinks,
  search_box: renderSearchBox,
  cart_button: renderCartButton,
  icon_button: renderIconButton,
  flex_space: renderFlexSpace,
}

export { RENDERERS }
