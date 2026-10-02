/**
 * The product form — one component for both creating and editing.
 *
 * Two modes, chosen by whether the product has options:
 *
 * - **Simple.** No options: one price, one SKU, one stock count. This is what
 *   most products are, and making every merchant build a one-row option matrix
 *   to sell a mug is the mistake this avoids.
 * - **Variants.** Options and their values generate the matrix. Editing an
 *   existing product's options preserves the price and stock on every
 *   combination that still exists — the server reconciles rather than rebuilds.
 */

import { Head, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { useShared } from '@/js/hooks'
import { ImageUploader, type UploadedImage } from '@/views/ui/ImageUploader'
import {
  Button,
  Checkbox,
  Field,
  Input,
  Panel,
  PageHeader,
  SectionTitle,
  Select,
  Textarea,
} from '@/views/ui/kit'
import { IconPlus, IconTrash } from '@/views/ui/icons'
import type { VariantRow } from '@/js/types'

type Option = { name: string; values: string[] }

type Product = {
  id: number
  title: string
  slug: string
  description: string
  summary: string | null
  status: string
  product_type: string | null
  vendor: string | null
  tags: string[]
  requires_shipping: boolean
  seo_title: string | null
  seo_description: string | null
  images: {
    id: number
    url: string
    alt: string | null
    placeholder: string | null
    dominant_color: string | null
    processing: boolean
  }[]
  options: { id: number; name: string; values: string[] }[]
  variants: VariantRow[]
  collection_ids: number[]
}

type Props = {
  product: Product | null
  collections: { id: number; title: string }[]
}

/** Minor units back to a decimal string, for a price input. */
function toDecimal(minor: number): string {
  return (minor / 100).toFixed(2)
}

export default function ProductEdit({ product, collections }: Props) {
  const { errors } = useShared()
  const editing = Boolean(product)

  const [options, setOptions] = useState<Option[]>(
    product?.options.map((option) => ({ name: option.name, values: option.values })) ?? [],
  )
  // Uploaded images are saved by their own endpoint, not by this form. What
  // is tracked here is only the *order*, which the form submits alongside
  // everything else so a reorder survives a save that never reached the
  // reorder endpoint.
  const [images, setImages] = useState<UploadedImage[]>(product?.images ?? [])
  const [collectionIds, setCollectionIds] = useState<number[]>(product?.collection_ids ?? [])

  const simple = product?.variants.find((variant) => variant.is_default) ?? product?.variants[0]

  const form = useForm({
    title: product?.title ?? '',
    slug: product?.slug ?? '',
    summary: product?.summary ?? '',
    description: product?.description ?? '',
    status: product?.status ?? 'draft',
    product_type: product?.product_type ?? '',
    vendor: product?.vendor ?? '',
    tags: (product?.tags ?? []).join(', '),
    requires_shipping: product?.requires_shipping ?? true,
    seo_title: product?.seo_title ?? '',
    seo_description: product?.seo_description ?? '',
    // Simple-mode fields.
    price: simple ? toDecimal(simple.price_minor) : '',
    compare_at: simple?.compare_at ? toDecimal(simple.compare_at.minor) : '',
    cost: simple?.cost ? toDecimal(simple.cost.minor) : '',
    sku: simple?.sku ?? '',
    barcode: simple?.barcode ?? '',
    stock: simple?.stock ?? 0,
    weight_grams: simple?.weight_grams ?? 0,
    track_inventory: simple?.track_inventory ?? true,
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const payload = {
      ...form.data,
      image_ids: images.map((image) => image.id),
      collection_ids: collectionIds,
      options: options.filter((option) => option.name.trim() && option.values.length > 0),
      // The matrix's own rows are not submitted here: the server generates the
      // cross product and keeps the price and stock of every combination that
      // still exists. Editing those is done on the product page afterwards.
      variants: [],
    }
    if (editing) {
      router.post(`/products/${product!.id}`, payload)
    } else {
      router.post('/products', payload)
    }
  }

  return (
    <form onSubmit={submit}>
      <Head title={editing ? `Edit ${product!.title}` : 'New product'} />
      <PageHeader
        breadcrumb={[
          { label: 'Products', href: '/products' },
          { label: editing ? product!.title : 'New' },
        ]}
        title={editing ? 'Edit product' : 'New product'}
        actions={
          <>
            <Button size="sm" onClick={() => router.visit('/products')}>Cancel</Button>
            <Button type="submit" tone="primary" size="sm" loading={form.processing}>
              {editing ? 'Save changes' : 'Create product'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <SectionTitle>Details</SectionTitle>
            <div className="space-y-3.5">
              <Field label="Title" required error={errors.title}>
                <Input
                  autoFocus
                  required
                  value={form.data.title}
                  invalid={Boolean(errors.title)}
                  onChange={(event) => form.setData('title', event.target.value)}
                  placeholder="Field Notebook"
                />
              </Field>

              <Field label="Short description" hint="One line, shown on listing cards.">
                <Input
                  value={form.data.summary}
                  onChange={(event) => form.setData('summary', event.target.value)}
                  maxLength={200}
                />
              </Field>

              <Field label="Description">
                <Textarea
                  rows={6}
                  value={form.data.description}
                  onChange={(event) => form.setData('description', event.target.value)}
                />
              </Field>
            </div>
          </Panel>

          {options.length === 0 && (
            <Panel>
              <SectionTitle>Pricing and stock</SectionTitle>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Field label="Price" required error={errors.price}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    required
                    value={form.data.price}
                    invalid={Boolean(errors.price)}
                    onChange={(event) => form.setData('price', event.target.value)}
                    placeholder="19.99"
                  />
                </Field>
                <Field label="Compare at" hint="Shown struck through.">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.data.compare_at}
                    onChange={(event) => form.setData('compare_at', event.target.value)}
                  />
                </Field>
                <Field label="Cost" hint="For margin. Never public.">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.data.cost}
                    onChange={(event) => form.setData('cost', event.target.value)}
                  />
                </Field>
                <Field label="SKU">
                  <Input
                    value={form.data.sku}
                    onChange={(event) => form.setData('sku', event.target.value)}
                  />
                </Field>
                <Field label="Barcode">
                  <Input
                    value={form.data.barcode}
                    onChange={(event) => form.setData('barcode', event.target.value)}
                  />
                </Field>
                <Field label="Stock on hand">
                  <Input
                    type="number"
                    min={0}
                    value={form.data.stock}
                    onChange={(event) => form.setData('stock', Number(event.target.value))}
                  />
                </Field>
              </div>

              <div className="mt-3.5 space-y-2 border-t border-[var(--color-line-soft)] pt-3.5">
                <Checkbox
                  label="Track inventory"
                  hint="Off for made-to-order or digital items — they never sell out."
                  checked={form.data.track_inventory}
                  onChange={(event) => form.setData('track_inventory', event.target.checked)}
                />
                <Checkbox
                  label="Requires shipping"
                  hint="Off for downloads: checkout skips the address and shipping."
                  checked={form.data.requires_shipping}
                  onChange={(event) => form.setData('requires_shipping', event.target.checked)}
                />
              </div>
            </Panel>
          )}

          <Panel>
            <SectionTitle
              action={
                options.length < 3 && (
                  <Button
                    size="sm"
                    onClick={() => setOptions([...options, { name: '', values: [] }])}
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    Add option
                  </Button>
                )
              }
            >
              Options
            </SectionTitle>

            {options.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">
                Add an option like Size or Colour to sell several variants of this
                product. Without one, it has a single price and stock count.
              </p>
            ) : (
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3"
                  >
                    <div className="flex items-end gap-2">
                      <Field label="Option name" className="flex-1">
                        <Input
                          value={option.name}
                          onChange={(event) => {
                            const next = [...options]
                            next[index] = { ...option, name: event.target.value }
                            setOptions(next)
                          }}
                          placeholder="Size"
                        />
                      </Field>
                      <Button
                        tone="danger"
                        size="sm"
                        onClick={() => setOptions(options.filter((_, i) => i !== index))}
                        aria-label={`Remove ${option.name || 'option'}`}
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Field
                      label="Values"
                      hint="Comma separated — Small, Medium, Large."
                      className="mt-2.5"
                    >
                      <Input
                        value={option.values.join(', ')}
                        onChange={(event) => {
                          const next = [...options]
                          next[index] = {
                            ...option,
                            values: event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean),
                          }
                          setOptions(next)
                        }}
                        placeholder="Small, Medium, Large"
                      />
                    </Field>
                  </div>
                ))}

                <p className="text-[12px] text-[var(--color-ink-soft)]">
                  Saving generates{' '}
                  <strong className="text-[var(--color-ink)]">
                    {options.reduce((total, option) => total * Math.max(option.values.length, 1), 1)}
                  </strong>{' '}
                  variants. Prices and stock are set on the product page afterwards, and
                  existing variants keep theirs.
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle>Search engine listing</SectionTitle>
            <div className="space-y-3.5">
              <Field label="Page title" hint="Falls back to the product title.">
                <Input
                  value={form.data.seo_title}
                  onChange={(event) => form.setData('seo_title', event.target.value)}
                  maxLength={200}
                />
              </Field>
              <Field label="Meta description" hint="About 150 characters is the sweet spot.">
                <Textarea
                  rows={2}
                  value={form.data.seo_description}
                  onChange={(event) => form.setData('seo_description', event.target.value)}
                  maxLength={400}
                />
              </Field>
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Panel>
            <SectionTitle>Status</SectionTitle>
            <Select
              value={form.data.status}
              onChange={(event) => form.setData('status', event.target.value)}
            >
              <option value="draft">Draft — hidden from your storefront</option>
              <option value="active">Active — on sale</option>
              <option value="archived">Archived — kept for history</option>
            </Select>
          </Panel>

          <Panel>
            <SectionTitle>Organisation</SectionTitle>
            <div className="space-y-3.5">
              <Field label="Product type">
                <Input
                  value={form.data.product_type}
                  onChange={(event) => form.setData('product_type', event.target.value)}
                  placeholder="Stationery"
                />
              </Field>
              <Field label="Vendor">
                <Input
                  value={form.data.vendor}
                  onChange={(event) => form.setData('vendor', event.target.value)}
                />
              </Field>
              <Field label="Tags" hint="Comma separated.">
                <Input
                  value={form.data.tags}
                  onChange={(event) => form.setData('tags', event.target.value)}
                  placeholder="paper, gift"
                />
              </Field>
            </div>
          </Panel>

          {collections.length > 0 && (
            <Panel>
              <SectionTitle>Collections</SectionTitle>
              <div className="max-h-52 space-y-1.5 overflow-y-auto">
                {collections.map((collection) => (
                  <Checkbox
                    key={collection.id}
                    label={collection.title}
                    checked={collectionIds.includes(collection.id)}
                    onChange={(event) =>
                      setCollectionIds(
                        event.target.checked
                          ? [...collectionIds, collection.id]
                          : collectionIds.filter((id) => id !== collection.id),
                      )
                    }
                  />
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <SectionTitle>Images</SectionTitle>
            <ImageUploader
              productId={product?.id ?? null}
              initial={images}
              onChange={setImages}
            />
          </Panel>
        </div>
      </div>
    </form>
  )
}
