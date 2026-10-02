import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { useCan } from '@/js/hooks'
import {
  Banner, Button, Field, Input, Mono, Panel, PanelHeader, PageHeader,
  Select, Stat, StatRow, Textarea,
} from '@/views/ui/kit'
import { IconExternal } from '@/views/ui/icons'

type Props = {
  seo: {
    title: string | null
    description: string | null
    og_image_url: string | null
    robots: string
  }
  urls: { sitemap: string; robots: string; canonical: string }
  products_missing: number
  products_total: number
}

export default function Seo({ seo, urls, products_missing, products_total }: Props) {
  const can = useCan()
  const [form, setForm] = useState({
    title: seo.title ?? '',
    description: seo.description ?? '',
    og_image_url: seo.og_image_url ?? '',
    robots: seo.robots,
  })
  const [saving, setSaving] = useState(false)

  const noindex = form.robots.startsWith('noindex')

  return (
    <>
      <Head title="SEO" />
      <PageHeader
        title="Search engine listing"
        description="How your shop appears in search results and when someone shares a link to it."
        actions={can('storefront.update') && (
          <Button tone="primary" size="sm" loading={saving}
            onClick={() => {
              setSaving(true)
              router.post('/storefront/seo', form, { preserveScroll: true, onFinish: () => setSaving(false) })
            }}>
            Save
          </Button>
        )}
      />

      {noindex && (
        <div className="mb-4">
          <Banner tone="caution" title="Your shop is hidden from search engines">
            <Mono>robots.txt</Mono> is serving <Mono>Disallow: /</Mono>. That is the right
            setting before launch and the wrong one after it.
          </Banner>
        </div>
      )}

      <StatRow>
        <Stat label="Active products" value={products_total} />
        <Stat label="Missing a description" value={products_missing}
          tone={products_missing > 0 ? 'critical' : 'positive'}
          hint={products_missing > 0 ? 'search engines write their own' : 'all covered'} />
      </StatRow>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <PanelHeader title="Store defaults"
              description="Used on any page that does not set its own." />
            <div className="space-y-3.5 pt-3.5">
              <Field label="Page title" hint="About 60 characters before it is truncated.">
                <Input value={form.title} maxLength={200}
                  onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </Field>
              <Field label="Meta description" hint="About 150–160 characters.">
                <Textarea rows={3} value={form.description} maxLength={400}
                  onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
              <Field label="Share image URL" hint="Shown when someone posts a link. 1200×630 works everywhere.">
                <Input value={form.og_image_url}
                  onChange={(event) => setForm({ ...form, og_image_url: event.target.value })} />
              </Field>
              <Field label="Indexing" hint="Turn indexing off while you are still setting up.">
                <Select value={form.robots}
                  onChange={(event) => setForm({ ...form, robots: event.target.value })}>
                  <option value="index,follow">Index and follow links</option>
                  <option value="index,nofollow">Index, do not follow links</option>
                  <option value="noindex,follow">Do not index, follow links</option>
                  <option value="noindex,nofollow">Hide from search entirely</option>
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Search result preview" />
            <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3.5">
              <p className="text-[12px] text-[var(--color-positive)]">{urls.canonical}</p>
              <p className="mt-0.5 text-[16px] leading-snug text-[var(--color-info)]">
                {form.title || 'Your store name'}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-ink-soft)]">
                {form.description || 'Add a description and it will appear here.'}
              </p>
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Generated files" description="Served live from your storefront" />
          <div className="space-y-2 pt-3">
            {[
              ['Sitemap', urls.sitemap, 'Every published product and collection.'],
              ['robots.txt', urls.robots, 'Follows your indexing choice above.'],
            ].map(([label, url, note]) => (
              <a key={url} href={url} target="_blank" rel="noreferrer"
                className="row-hover flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] p-2.5 transition-colors">
                <IconExternal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-faint)]" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-[var(--color-ink)]">{label}</span>
                  <span className="block truncate text-[11.5px] text-[var(--color-ink-faint)]">{note}</span>
                </span>
              </a>
            ))}
          </div>

          {products_missing > 0 && (
            <div className="mt-3">
              <Banner tone="caution">
                {products_missing} active {products_missing === 1 ? 'product has' : 'products have'} no
                meta description. Search engines will invent one from the page copy.
              </Banner>
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
