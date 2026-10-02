import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { useCan } from '@/js/hooks'
import {
  Badge, Button, Checkbox, Empty, Field, Input, Modal, PageHeader,
  Select, TBody, TD, TH, THead, TR, Table, Textarea,
} from '@/views/ui/kit'
import { IconPlus, IconTag } from '@/views/ui/icons'

type Collection = {
  id: number
  title: string
  slug: string
  description: string
  kind: 'manual' | 'automatic'
  rules: { field: string; operator: string; value: string }[]
  image_url: string | null
  is_published: boolean
  product_count: number
}

type Props = {
  collections: Collection[]
  products: { id: number; title: string }[]
}

export default function CollectionsIndex({ collections, products }: Props) {
  const can = useCan()
  const [editing, setEditing] = useState<Collection | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Head title="Collections" />
      <PageHeader
        title="Collections"
        description="Groups of products, shown as categories on your storefront."
        actions={
          can('products.update') && (
            <Button tone="primary" size="sm" onClick={() => setCreating(true)}>
              <IconPlus className="h-3.5 w-3.5" />
              New collection
            </Button>
          )
        }
      />

      {collections.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconTag className="h-6 w-6" />}
            title="No collections yet"
            body="A collection groups products so shoppers can browse by category. Manual collections list products you choose; automatic ones match a rule."
            action={
              can('products.update') && (
                <Button tone="primary" size="sm" onClick={() => setCreating(true)}>
                  <IconPlus className="h-3.5 w-3.5" />
                  Create one
                </Button>
              )
            }
          />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Collection</TH>
              <TH>Type</TH>
              <TH>Visibility</TH>
              <TH align="right">Products</TH>
              {can('products.update') && <TH />}
            </tr>
          </THead>
          <TBody>
            {collections.map((collection) => (
              <TR key={collection.id}>
                <TD>
                  <span className="font-medium text-[var(--color-ink)]">{collection.title}</span>
                  {collection.description && (
                    <span className="block max-w-md truncate text-[12px] text-[var(--color-ink-faint)]">
                      {collection.description}
                    </span>
                  )}
                </TD>
                <TD><Badge tone={collection.kind === 'automatic' ? 'accent' : 'neutral'}>{collection.kind}</Badge></TD>
                <TD>
                  <Badge tone={collection.is_published ? 'positive' : 'neutral'} dot>
                    {collection.is_published ? 'published' : 'hidden'}
                  </Badge>
                </TD>
                <TD align="right">{collection.product_count}</TD>
                {can('products.update') && (
                  <TD align="right">
                    <Button size="sm" onClick={() => setEditing(collection)}>Edit</Button>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {(creating || editing) && (
        <CollectionModal
          collection={editing}
          products={products}
          onClose={() => { setCreating(false); setEditing(null) }}
        />
      )}
    </>
  )
}

function CollectionModal({
  collection, products, onClose,
}: {
  collection: Collection | null
  products: { id: number; title: string }[]
  onClose: () => void
}) {
  const [title, setTitle] = useState(collection?.title ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [kind, setKind] = useState<'manual' | 'automatic'>(collection?.kind ?? 'manual')
  const [published, setPublished] = useState(collection?.is_published ?? true)
  const [imageUrl, setImageUrl] = useState(collection?.image_url ?? '')
  const [productIds, setProductIds] = useState<number[]>([])
  const [ruleValue, setRuleValue] = useState(collection?.rules[0]?.value ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open onClose={onClose}
      title={collection ? 'Edit collection' : 'New collection'}
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button
            tone="primary" size="sm" loading={saving} disabled={!title.trim()}
            onClick={() => {
              setSaving(true)
              router.post('/collections', {
                id: collection?.id,
                title, description, kind,
                is_published: published,
                image_url: imageUrl,
                product_ids: kind === 'manual' ? productIds : [],
                rules: kind === 'automatic' && ruleValue
                  ? [{ field: 'tag', operator: 'contains', value: ruleValue }]
                  : [],
              }, { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Title" required>
          <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Winter essentials" />
        </Field>

        <Field label="Description">
          <Textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        <Field label="Image URL">
          <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" />
        </Field>

        <Field label="How products join" hint="Automatic collections pick up new products that match, without you revisiting them.">
          <Select value={kind} onChange={(event) => setKind(event.target.value as 'manual' | 'automatic')}>
            <option value="manual">I choose them</option>
            <option value="automatic">Anything with a tag</option>
          </Select>
        </Field>

        {kind === 'automatic' ? (
          <Field label="Tag" hint="Every active product carrying this tag joins automatically.">
            <Input value={ruleValue} onChange={(event) => setRuleValue(event.target.value)} placeholder="winter" />
          </Field>
        ) : (
          <Field label="Products" hint={collection ? 'Re-selecting replaces the current list.' : undefined}>
            <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] p-2">
              {products.length === 0 ? (
                <p className="py-3 text-center text-[12.5px] text-[var(--color-ink-faint)]">
                  No products yet.
                </p>
              ) : products.map((product) => (
                <Checkbox
                  key={product.id}
                  label={product.title}
                  checked={productIds.includes(product.id)}
                  onChange={(event) =>
                    setProductIds(event.target.checked
                      ? [...productIds, product.id]
                      : productIds.filter((id) => id !== product.id))
                  }
                />
              ))}
            </div>
          </Field>
        )}

        <Checkbox
          label="Published"
          hint="Hidden collections stay off your storefront."
          checked={published}
          onChange={(event) => setPublished(event.target.checked)}
        />
      </div>
    </Modal>
  )
}
