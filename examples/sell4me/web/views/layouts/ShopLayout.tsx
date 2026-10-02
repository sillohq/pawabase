/**
 * The storefront's chrome — a completely different surface from the dashboard.
 *
 * The merchant's theme is applied as CSS custom properties on a wrapper rather
 * than by generating classes, so a colour change is one style attribute and no
 * stylesheet has to be regenerated. Every value has already been sanitised on
 * the server (`app/services/storefront.py`), so nothing arbitrary reaches a
 * rendered property.
 */

import { Link, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { RenderBlocks, type BlockNode } from '@/views/ui/blocks'
import HelpDeskWidget from '@/views/ui/HelpDeskWidget'
import { DEFAULT_NAVBAR } from '@/views/ui/navbar'

type Theme = {
  logo_url: string | null
  colors: Record<string, string>
  fonts: { heading: string; body: string }
  corner_style: 'sharp' | 'soft' | 'round'
  header_links: { label: string; url: string }[]
  footer_links: { label: string; url: string }[]
  social_links: Record<string, string>
  style: Record<string, string>
  announcement: string | null
  footer_text: string | null
  store: { name: string; slug: string; currency: string; support_email: string | null }
  help_desk: { enabled: boolean; greeting: string | null }
}

const RADIUS = { sharp: '0px', soft: '6px', round: '14px' }

export default function ShopLayout({ children }: { children: ReactNode }) {
  const props = usePage().props as unknown as { theme?: Theme; cart_count?: number; header?: BlockNode[] | null; header_css?: string }
  const theme = props.theme

  // Marks the document as a storefront rather than the dashboard. `main.tsx`
  // reads it to decide whether the browser tab gets the platform's name
  // appended — a shopper's tab should say whose shop they are in, not ours.
  useEffect(() => {
    document.documentElement.dataset.surface = 'shop'
    return () => {
      delete document.documentElement.dataset.surface
    }
  }, [])

  // The theme's typefaces. The builder's canvas loads them itself (see
  // `views/ui/chai/canvas.ts`), and the shop never did — so every storefront
  // rendered in the system font whatever the merchant had picked. Both names
  // are from the server's allowlist (`storefront.FONTS`), so the URL is built
  // from known values only.
  const heading = theme?.fonts.heading
  const body = theme?.fonts.body
  useEffect(() => {
    if (!heading || !body) return
    const families = [...new Set([heading, body])]
    const href =
      'https://fonts.googleapis.com/css2?' +
      families.map((family) => `family=${family.replace(/ /g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400`).join('&') +
      '&display=swap'
    let link = document.getElementById('shop-fonts') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = 'shop-fonts'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    if (link.href !== href) link.href = href
  }, [heading, body])

  if (!theme) return <>{children}</>

  const { colors, fonts } = theme

  return (
    <div
      // `shop-surface` plus the template's aesthetic as data attributes. Every
      // rule in `views/ui/shop-style.css` reads these, which is how one set of
      // blocks renders as ten genuinely different shops.
      className="shop-surface flex min-h-screen flex-col"
      data-scale={theme.style?.scale}
      data-tracking={theme.style?.tracking}
      data-case={theme.style?.case}
      data-rhythm={theme.style?.rhythm}
      data-edge={theme.style?.edge}
      data-texture={theme.style?.texture}
      data-measure={theme.style?.measure}
      style={
        {
          '--shop-bg': colors.background,
          '--shop-surface': colors.surface,
          '--shop-text': colors.text,
          '--shop-muted': colors.muted,
          '--shop-line': colors.border,
          '--shop-primary': colors.primary,
          '--shop-accent': colors.accent,
          '--shop-radius': RADIUS[theme.corner_style] ?? '6px',
          '--shop-heading-font': `"${fonts.heading}", ui-serif, Georgia, serif`,
          background: colors.background,
          color: colors.text,
          fontFamily: `"${fonts.body}", ui-sans-serif, system-ui, sans-serif`,
          fontSize: '15px',
        } as React.CSSProperties
      }
    >
      {theme.announcement && (
        <div
          className="px-4 py-2 text-center text-[13px]"
          style={{ background: colors.primary, color: colors.background }}
        >
          {theme.announcement}
        </div>
      )}

      {props.header_css && <style dangerouslySetInnerHTML={{ __html: props.header_css }} />}
      <RenderBlocks
        blocks={props.header?.length ? props.header : [DEFAULT_NAVBAR]}
        context={{
          products: [],
          collections: [],
          shop: {
            name: theme.store.name,
            logo_url: theme.logo_url,
            header_links: theme.header_links,
            cart_count: props.cart_count ?? 0,
          },
        }}
      />

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t" style={{ borderColor: colors.border }}>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-xs">
              <p className="text-[15px] font-semibold" style={{ fontFamily: `"${fonts.heading}", serif` }}>
                {theme.store.name}
              </p>
              {theme.footer_text && (
                <p className="mt-2 text-[13px]" style={{ color: colors.muted }}>
                  {theme.footer_text}
                </p>
              )}
              {theme.store.support_email && (
                <a
                  href={`mailto:${theme.store.support_email}`}
                  className="mt-2 inline-block text-[13px] underline underline-offset-2"
                  style={{ color: colors.muted }}
                >
                  {theme.store.support_email}
                </a>
              )}
            </div>

            {theme.footer_links.length > 0 && (
              <nav className="grid gap-2 text-[13px]">
                {theme.footer_links.map((link) => (
                  <Link key={link.url} href={link.url} className="hover:opacity-60" style={{ color: colors.muted }}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {Object.keys(theme.social_links).length > 0 && (
              <div className="flex gap-3 text-[13px]">
                {Object.entries(theme.social_links).map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="capitalize hover:opacity-60"
                    style={{ color: colors.muted }}
                  >
                    {name}
                  </a>
                ))}
              </div>
            )}
          </div>

          <p className="mt-8 text-[12px]" style={{ color: colors.muted }}>
            © {new Date().getFullYear()} {theme.store.name}. All rights reserved.
          </p>
        </div>
      </footer>

      {theme.help_desk?.enabled && (
        <HelpDeskWidget storeSlug={theme.store.slug} greeting={theme.help_desk.greeting} accent={colors.accent} />
      )}
    </div>
  )
}
