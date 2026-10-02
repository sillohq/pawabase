/**
 * Making the canvas iframe look like the shop.
 *
 * The builder renders the page inside an iframe, which is the right call — a
 * page being edited must not inherit the dashboard's styles — but it means the
 * canvas starts as an empty document that knows nothing about the merchant's
 * theme. Two consequences, and the second one is why this file exists:
 *
 1. **The theme's custom properties are not there.** Every block reads
 *    `--shop-bg`, `--shop-text`, `--shop-primary` and the rest, which the
 *    storefront's layout sets on a wrapper. Without them a dark theme renders
 *    near-white text on the iframe's white default and the canvas looks
 *    *empty* — not broken, empty, which is a much harder thing to diagnose
 *    from a screenshot.
 *
 * 2. **Our stylesheet is not there either.** The library loads a Tailwind of
 *    its own from a CDN — v3, at a URL we do not control — while the block
 *    renderers were compiled against our v4 build. Most utilities happen to
 *    overlap; the ones that do not are exactly ours (`bg-canvas`,
 *    `rounded-[var(--radius-sm)]`, every custom token), so the canvas renders
 *    as unstyled markup with a few coincidences.
 *
 * So both go in, **in this order**: our stylesheet first, then the theme. The
 * order is the whole trick. Our base layer paints `body` in the dashboard's
 * colours, which would fight the shop's theme and win by loading second — so
 * the theme block is appended last and takes it back. Getting this backwards
 * gives a canvas painted like the admin, which was the first attempt.
 *
 * Reaching into another document's head is not elegant; it is what the library
 * leaves us, and the alternative is a canvas that does not show the merchant
 * their shop.
 */

export type CanvasTheme = {
  colors: Record<string, string>
  fonts: { heading: string; body: string }
  corner_style: string
  /** The template's aesthetic — type scale, rhythm, edges, texture. */
  style?: Record<string, string>
}

/** The dashboard's brand plum, for the editor's own marks on the canvas. */
const EDITOR_MARK = 'oklch(0.47 0.12 350)'

const RADIUS: Record<string, string> = { sharp: '0px', soft: '6px', round: '14px' }

/** Our own injected tags, so re-runs replace rather than accumulate. */
const STYLE_ID = 'commerce-canvas-theme'
const SHEET_ID = 'commerce-canvas-sheet'

/**
 * Apply the shop's look to the canvas.
 *
 * Returns a teardown. Safe to call before the iframe exists — it polls briefly
 * rather than assuming, because the iframe is mounted by the library on its own
 * schedule and there is no callback for it.
 */
export function paintCanvas(theme: CanvasTheme): () => void {
  let stopped = false
  let timer: number | undefined

  function attempt() {
    if (stopped) return

    const frame = document.getElementById('canvas-iframe') as HTMLIFrameElement | null
    const doc = frame?.contentDocument
    if (!doc?.head) {
      timer = window.setTimeout(attempt, 250)
      return
    }

    copyStylesheets(doc)
    // After the stylesheet, always. See the note at the top of the file.
    applyTheme(doc, theme)

    // Keep trying for a while: the library replaces the iframe's document when
    // the device width changes, which drops everything we put in it.
    timer = window.setTimeout(attempt, 1500)
  }

  attempt()

  return () => {
    stopped = true
    if (timer) window.clearTimeout(timer)
  }
}

/**
 * Our compiled CSS, copied into the iframe.
 *
 * By reference in production, where it is a hashed file the browser has
 * already fetched and cached, and by value in development, where Vite injects
 * it as an inline `<style>` and there is no URL to point at. Both are handled
 * because the builder has to work in both.
 *
 * Idempotent: a marker element records that it has run, so the poll that
 * survives the library re-creating the document does not append a second copy
 * every 1.5 seconds.
 */
function copyStylesheets(doc: Document) {
  if (doc.getElementById(SHEET_ID)) return

  const marker = doc.createElement('meta')
  marker.id = SHEET_ID
  doc.head.appendChild(marker)

  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
    const copy = doc.createElement('link')
    copy.rel = 'stylesheet'
    copy.href = link.href
    doc.head.appendChild(copy)
  }

  for (const style of document.querySelectorAll<HTMLStyleElement>('style')) {
    // Not the library's own: its canvas-highlight and selection rules are
    // written for the parent document, and copying them in draws selection
    // outlines on the page itself.
    if (style.id.startsWith('chai') || style.id.startsWith('selected-')) continue
    if (style.id.startsWith('commerce-canvas')) continue
    const copy = doc.createElement('style')
    copy.textContent = style.textContent
    doc.head.appendChild(copy)
  }
}

/**
 * The theme, as the custom properties every block renderer reads.
 *
 * Written on `:root` and `body` rather than on a wrapper, because the library
 * owns the element the blocks are mounted into and we do not get to wrap it.
 */
function applyTheme(doc: Document, theme: CanvasTheme) {
  const c = theme.colors
  const css = `
    :root {
      --shop-bg: ${c.background};
      --shop-surface: ${c.surface};
      --shop-text: ${c.text};
      --shop-muted: ${c.muted};
      --shop-line: ${c.border};
      --shop-primary: ${c.primary};
      --shop-accent: ${c.accent};
      --shop-radius: ${RADIUS[theme.corner_style] ?? '6px'};
      --shop-heading-font: "${theme.fonts.heading}", ui-sans-serif, system-ui, sans-serif;
    }
    /* The aesthetic layer's own hook. The canvas is a different document, so
       the storefront layout's wrapper is not here — the body takes its place,
       and applyAesthetic below writes the same data attributes onto it.
       Without it the builder shows a shop with none of its template's
       character, and the merchant arranges a page that does not exist. */

    /* !important on exactly these three. Our stylesheet's base layer paints
       the body in the dashboard's colours, and it is in this iframe because
       the block utilities came with it. This is the line that says the canvas
       belongs to the shop, not to the admin. */
    html, body {
      background: ${c.background} !important;
      color: ${c.text} !important;
      font-family: "${theme.fonts.body}", ui-sans-serif, system-ui, sans-serif !important;
      font-size: 15px;
    }
    /* The canvas is the shop, so a block with nothing in it yet still needs to
       be clickable. Without a minimum an empty section is zero pixels tall and
       there is nothing to select. */
    [data-block-id]:empty { min-height: 2rem; }

    /* The editor's marks on the canvas, in the dashboard's plum. The library
       draws the hover and selection outlines in a hardcoded blue, from rules
       it rewrites on every selection, so they cannot be edited — only
       outranked. Each selector here is more specific than the library's
       (\`[data-block-id="…"]\`) and sets only the colour, so its width, offset
       and the rule deciding *which* block is outlined all stay the library's. */
    html body [data-block-id],
    html body [data-style-id],
    html body [data-highlighted],
    html body .air-highlight {
      outline-color: ${EDITOR_MARK} !important;
    }
    /* The selected block's name tag and its actions. */
    html body .isolate.bg-blue-500 {
      background-color: ${EDITOR_MARK} !important;
    }
  `

  let tag = doc.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = doc.createElement('style')
    tag.id = STYLE_ID
  }
  if (tag.textContent !== css) tag.textContent = css
  // Appended (or re-appended) last, so it wins over the dashboard base layer
  // that came in with our stylesheet.
  doc.head.appendChild(tag)

  applyAesthetic(doc, theme)
  loadFonts(doc, theme)
}


/**
 * The template's aesthetic, onto the canvas document.
 *
 * The storefront sets these on a wrapper element; the canvas has no wrapper we
 * own, so they go on `<body>` and the `.shop-surface` class goes with them.
 * Same attributes, same stylesheet, same result — which is the point: a canvas
 * that renders the shop *without* its template's rhythm and scale is showing
 * the merchant a page that does not exist.
 */
function applyAesthetic(doc: Document, theme: CanvasTheme) {
  const body = doc.body
  if (!body) return

  body.classList.add('shop-surface')
  const style = theme.style ?? {}
  for (const field of ['scale', 'tracking', 'case', 'rhythm', 'edge', 'texture', 'measure']) {
    const value = style[field]
    if (value) body.dataset[field] = value
    else delete body.dataset[field]
  }
}

/** The theme's typefaces, from Google Fonts, in the iframe. */
function loadFonts(doc: Document, theme: CanvasTheme) {
  const families = [...new Set([theme.fonts.heading, theme.fonts.body])]
  const href =
    'https://fonts.googleapis.com/css2?' +
    families.map((family) => `family=${family.replace(/ /g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400`).join('&') +
    '&display=swap'

  const id = 'commerce-canvas-fonts'
  let link = doc.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = doc.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    doc.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}
