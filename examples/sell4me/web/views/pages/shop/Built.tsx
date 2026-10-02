import { Head } from '@inertiajs/react'
import { RenderBlocks, type BlockContext, type BlockNode } from '@/views/ui/blocks'

/**
 * A page the merchant built, on the live shop.
 *
 * There is almost nothing here, and that is the design: the same renderers
 * that draw the builder's canvas draw the shop. Two implementations would mean
 * a merchant arranging a page that looks one way in the editor and another way
 * to their customers — which is the single failure that makes a visual builder
 * not worth having.
 *
 * Everything the blocks refer to — products, collections — arrives already
 * resolved in `context`. See `app/services/pagedata.py`.
 */

type Props = {
  page: {
    title: string
    path: string
    seo_title: string
    seo_description: string | null
    og_image_url: string | null
    noindex: boolean
    settings: Record<string, unknown>
  }
  tree: BlockNode[]
  context: BlockContext
  /** CSS for the classes set in the builder's Style tab. See `app/services/pagecss.py`. */
  page_css?: string
  preview: boolean
  /** True when this is the built-in starter page, not one the merchant saved. */
  starter?: boolean
  theme: { store: { name: string }; seo: { title: string; description: string | null } }
}

export default function Built({ page, tree, context, page_css, preview, starter, theme }: Props) {
  return (
    <>
      <Head>
        <title>{page.seo_title}</title>
        {page.seo_description && <meta name="description" content={page.seo_description} />}
        {page.og_image_url && <meta property="og:image" content={page.og_image_url} />}
        <meta property="og:title" content={page.seo_title} />
        <meta property="og:type" content="website" />
        {/* A draft is never indexed, whatever the page's own setting says. */}
        {page.noindex && <meta name="robots" content="noindex,nofollow" />}
      </Head>

      {starter && (
        // Only a signed-in member of this store ever sees the dashboard, so
        // this is aimed at them and harmless to a shopper: it is a plain
        // sentence about the shop, not a broken-looking admin notice.
        <div
          className="px-4 py-2 text-center text-[12px]"
          style={{ background: 'var(--shop-surface)', color: 'var(--shop-muted)' }}
        >
          This is {theme.store.name}'s starter homepage. Open the builder to make it yours.
        </div>
      )}

      {/* Compiled on the server from sanitised class names only — see
          `pagecss.py` — so it can be inlined without escaping concerns. */}
      {page_css && <style dangerouslySetInnerHTML={{ __html: page_css }} />}

      {preview && (
        <div
          className="px-4 py-2 text-center text-[12.5px] font-medium"
          style={{ background: 'var(--shop-accent)', color: 'var(--shop-bg)' }}
        >
          Draft preview — your customers see the published version.
        </div>
      )}

      {tree.length > 0 ? (
        <RenderBlocks blocks={tree} context={context} />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-[28px] font-semibold">{theme.store.name}</h1>
          <p className="mt-2" style={{ color: 'var(--shop-muted)' }}>
            This page has nothing on it yet.
          </p>
        </div>
      )}
    </>
  )
}
