/**
 * The mark.
 *
 * A parcel seen from above, drawn as three strokes: two sides of a box in
 * outline and the seam across it, with the seam breaking into an upward step.
 * A package that is also a rising line — which is the whole product in one
 * glyph, and reads at 16px as well as at 200px.
 *
 * Built from paths on a 32-unit grid rather than traced from a design tool, so
 * every coordinate is a round number and the stroke weight matches the icon
 * set exactly (1.5 at 24px, scaled proportionally).
 *
 * `currentColor` throughout, so it inherits — a dark mark on the light shell, a
 * light one in the dark, and the plum accent where the accent belongs. No
 * gradients: a mark that depends on one stops working the moment it is
 * embossed, faxed, or rendered at 16px in a browser tab.
 */

type LogoProps = {
  className?: string
  /** Draw the wordmark beside the glyph. Off for a favicon or a tight corner. */
  withWordmark?: boolean
  title?: string
}

export function LogoMark({ className = 'h-6 w-6', title }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}

      {/* The box: an isometric top, cut so the two visible faces read as a
          parcel rather than as a cube. */}
      <path
        d="M16 3.4 27.2 9.2v13.6L16 28.6 4.8 22.8V9.2L16 3.4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* The seam across the top face. Stops short of centre, where the rising
          line takes over — the two are one continuous read. */}
      <path
        d="M4.9 9.3 16 15.1l11.1-5.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />

      {/* The rise. Where a parcel icon would drop a plain vertical seam, this
          steps upward — the growth the product is for. */}
      <path
        d="M16 28.4v-6.1l4.7-4.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ className, withWordmark = true, title = 'Commerce' }: LogoProps) {
  if (!withWordmark) return <LogoMark className={className} title={title} />

  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={className ?? 'h-6 w-6'} title={title} />
      <span className="text-[15px] font-semibold tracking-[-0.015em] text-ink dark:text-slate-100">
        {title}
      </span>
    </span>
  )
}

/**
 * The mark as a standalone SVG document.
 *
 * For the places React does not reach: a mail template's header, an export's
 * cover, an OG image. `public/logo.svg` holds the same paths for the browser
 * to fetch, and `public/favicon.svg` the same again in a literal plum, since a
 * browser tab has no `currentColor` to inherit.
 *
 * Three duplications of three paths, kept in step by hand. A build step to
 * generate them would be more machinery than one glyph is worth.
 */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path d="M16 3.4 27.2 9.2v13.6L16 28.6 4.8 22.8V9.2L16 3.4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <path d="M4.9 9.3 16 15.1l11.1-5.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
  <path d="M16 28.4v-6.1l4.7-4.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
