/**
 * Our blocks, registered with ChaiBuilder.
 *
 * This is the load-bearing file of the whole builder, and the reason is one
 * sentence: **the components registered here are the same components the shop
 * renders.** `views/ui/blocks.tsx` holds one set of renderers; the canvas
 * mounts them through ChaiBuilder and the storefront mounts them directly. A
 * merchant arranging a page is looking at their shop, not at an approximation
 * of it — which is the single thing that makes a visual builder worth having,
 * and the single thing that goes wrong when the editor gets its own renderers.
 *
 * The definitions are generated from the *server's* registry, sent down as
 * `catalogue`. So a new block type is still one entry in
 * `app/services/builder.py` and one renderer in `blocks.tsx`; nothing here
 * needs touching, and there is no third list to keep in step.
 *
 * The storefront never imports this file, or ChaiBuilder at all. A shopper
 * downloads the renderers and nothing else — the editor is a dashboard chunk.
 */

import { registerChaiBlock, registerChaiBlockSchema, stylesProp } from '@chaibuilder/runtime'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AlertCircleIcon,
  ArrowLeftRightIcon,
  ArrowUpDownIcon,
  DashboardSquare01Icon,
  Grid02Icon,
  LayoutTwoRowIcon,
  LeftToRightListBulletIcon,
  Link04Icon,
  Location01Icon,
  MusicNote01Icon,
  Share08Icon,
  SourceCodeIcon,
  Table01Icon,
  Tag01Icon,
  UserCircleIcon,
  Building03Icon,
  ChartColumnIcon,
  CheckListIcon,
  ColumnInsertIcon,
  CursorPointer01Icon,
  DashedLine01Icon,
  GridViewIcon,
  Heading01Icon,
  HelpCircleIcon,
  Image01Icon,
  Image02Icon,
  ImageCompositionIcon,
  LabelIcon,
  LayoutTwoColumnIcon,
  Mail01Icon,
  Megaphone01Icon,
  Menu01Icon,
  Search01Icon,
  NewsIcon,
  Package01Icon,
  QuoteDownIcon,
  ShoppingBag01Icon,
  SplitIcon,
  SquareIcon,
  StarIcon,
  TextIcon,
  Tv01Icon,
  Video01Icon,
  WorkflowSquare01Icon,
} from '@hugeicons/core-free-icons'
import type { ChaiBlockComponentProps } from '@chaibuilder/runtime'
import { RENDERERS, placementNote, type BlockContext, type BlockNode } from '@/views/ui/blocks'
import type { SubField } from '@/views/ui/chai/fields'
import { toChai } from '@/views/ui/chai/tree'

/** One field, as the server describes it. */
export type CatalogueField = {
  name: string
  label: string
  kind: string
  default: unknown
  help: string
  options: { value: string; label: string }[]
  minimum: number | null
  maximum: number | null
  fields: SubField[]
}

/** One block type, as the server describes it. */
export type CatalogueEntry = {
  type: string
  label: string
  description: string
  group: string
  icon: string
  accepts: string[]
  insertable: boolean
  /** Whether the Add panel offers it. Table rows and list items are reached through their parent. */
  listed: boolean
  /** A tree of blocks the Add panel inserts in place of a bare block of this type. */
  compose: BlockNode[] | null
  fields: CatalogueField[]
}

/**
 * The data the renderers look up while drawing — products, collections.
 *
 * Held in a module-level box rather than passed through ChaiBuilder, because
 * ChaiBuilder constructs the block components itself and gives us no channel
 * to thread a value down. A React context would be the usual answer and does
 * not work here: the canvas renders inside an iframe, in a tree we do not own,
 * so our provider is not above it.
 *
 * Written once when the editor mounts and read during render. Not state: it
 * never changes while a page is being edited, so there is nothing to subscribe
 * to and no re-render to trigger.
 */
let canvasContext: BlockContext = { products: [], collections: [] }

export function setCanvasContext(context: BlockContext) {
  canvasContext = context
}

/**
 * A glyph per block type, for the Add panel.
 *
 * Without one the library draws the same square for every block, and a grid of
 * twenty-eight identical squares makes the labels do all the work. Keyed by
 * type here rather than sent by the server: the server's `icon` names a coarse
 * family for the dashboard, and this is a picture of the block itself. A type
 * missing from the map still gets the square, so a new block is never blocked
 * on choosing one.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GLYPHS: Record<string, any> = {
  section: SquareIcon,
  columns: LayoutTwoColumnIcon,
  column: ColumnInsertIcon,
  spacer: ArrowUpDownIcon,
  divider: DashedLine01Icon,
  hero: ImageCompositionIcon,
  heading: Heading01Icon,
  text: TextIcon,
  button: CursorPointer01Icon,
  value_props: CheckListIcon,
  testimonial: QuoteDownIcon,
  faq: HelpCircleIcon,
  newsletter: Mail01Icon,
  image: Image01Icon,
  video: Video01Icon,
  product_grid: ShoppingBag01Icon,
  featured_product: Package01Icon,
  collection_list: GridViewIcon,
  eyebrow: LabelIcon,
  stats: ChartColumnIcon,
  logos: Building03Icon,
  icon_feature: StarIcon,
  gallery: Image02Icon,
  split_banner: SplitIcon,
  editorial: NewsIcon,
  steps: WorkflowSquare01Icon,
  marquee: Tv01Icon,
  announcement: Megaphone01Icon,
  navbar: Menu01Icon,
  header_bar: LayoutTwoRowIcon,
  site_logo: Image01Icon,
  nav_links: Link04Icon,
  search_box: Search01Icon,
  cart_button: ShoppingBag01Icon,
  icon_button: UserCircleIcon,
  flex_space: ArrowLeftRightIcon,
  box: DashboardSquare01Icon,
  row: ArrowLeftRightIcon,
  grid: Grid02Icon,
  quote: QuoteDownIcon,
  link: Link04Icon,
  badge: Tag01Icon,
  code: SourceCodeIcon,
  list: LeftToRightListBulletIcon,
  callout: AlertCircleIcon,
  accordion: LayoutTwoRowIcon,
  table: Table01Icon,
  rating: StarIcon,
  icon: StarIcon,
  avatar: UserCircleIcon,
  audio: MusicNote01Icon,
  map: Location01Icon,
  social_links: Share08Icon,
}

function glyphFor(type: string) {
  const glyph = GLYPHS[type] ?? SquareIcon
  return function BlockGlyph({ className, ...rest }: { className?: string }) {
    // `rest` carries the library's `data-add-core-block-icon`, which the
    // Add panel's styling hooks onto.
    return <HugeiconsIcon icon={glyph} className={className} strokeWidth={1.5} {...rest} />
  }
}

const GROUP_ORDER = ['layout', 'text', 'media', 'data', 'content', 'commerce']

function groupRank(group: string) {
  const index = GROUP_ORDER.indexOf(group)
  return index === -1 ? GROUP_ORDER.length : index
}

/** Registration is global and must happen once, not once per mount. */
let registered = false

export function registerCatalogue(catalogue: CatalogueEntry[]) {
  if (registered) return
  registered = true

  const acceptsOf = new Map(catalogue.map((entry) => [entry.type, entry.accepts]))

  // The Add panel lists groups in the order blocks were registered, so the
  // small pieces a page is built from come first and the larger composed
  // blocks after them.
  const ordered = [...catalogue].sort(
    (a, b) => groupRank(a.group) - groupRank(b.group),
  )

  for (const entry of ordered) {
    registerChaiBlock(component(entry), {
      type: entry.type,
      label: entry.label,
      description: entry.description,
      group: entry.group,
      icon: glyphFor(entry.type),
      category: 'core',
      // A container in ChaiBuilder's sense: it accepts children, so the canvas
      // offers a drop target inside it rather than only beside it.
      wrapper: entry.accepts.length > 0,
      // `column` is placed by its parent and never dragged in on its own —
      // the same rule the server enforces in `sanitise`.
      hidden: !entry.insertable || !entry.listed,
      // A composition, when the server gives one: the Add panel's "Hero" is a
      // section of real blocks rather than one block with its button as a
      // prop, so every part of it can be selected on the canvas. Fresh ids on
      // every insert, or two heroes would share their children.
      ...(entry.compose ? { blocks: () => toChai(withFreshIds(entry.compose ?? [])) } : {}),
      ...registerChaiBlockSchema({ properties: schemaFor(entry) }),
      // Enforced here for the editing experience and *again* on the server,
      // which is the copy that matters. This one stops a merchant dropping a
      // section inside a heading; the server's stops a crafted request doing
      // the same thing.
      // Only containers declare `canAcceptBlock`: the library reads its mere
      // presence as "this block takes children" and offers an add-inside
      // button on a heading otherwise.
      ...(entry.accepts.length > 0
        ? { canAcceptBlock: (type: string) => entry.accepts.includes(type) }
        : {}),
      // Asked of the *child*, with the parent's type. It used to check the
      // child's own `accepts`, which is empty for every leaf, so a heading
      // answered "cannot go anywhere".
      canBeNested: (parentType: string) => acceptsOf.get(parentType)?.includes(entry.type) ?? true,
      canDelete: () => entry.insertable,
      canMove: () => entry.insertable,
      canDuplicate: () => entry.insertable,
    })
  }
}

/**
 * The React component ChaiBuilder mounts for one block type.
 *
 * It rebuilds the nested shape our renderers expect — `{id, type, props,
 * children}` — from the flat props ChaiBuilder hands over, and passes
 * ChaiBuilder's own `children` through `renderChildren` so each child stays
 * individually selectable on the canvas. That slot is why one renderer can
 * serve both surfaces: see the note on `BlockContext.renderChildren`.
 */
function component(entry: CatalogueEntry) {
  const renderer = RENDERERS[entry.type]

  return function ChaiRenderedBlock(props: ChaiBlockComponentProps<Record<string, unknown>>) {
    const { blockProps, children, _id } = props
    // `stylesProp` resolves to `{className}` at render time. Spread onto the
    // wrapper so what the Styles tab sets actually reaches the element.
    const styles = (props as Record<string, any>).styles ?? {}

    if (!renderer) {
      // A type the server knows and the front end has no renderer for. Shown
      // as a labelled placeholder rather than nothing, so the mismatch is
      // visible to whoever is looking at the canvas instead of silent.
      return (
        <div {...blockProps} className="border border-dashed border-current/30 p-4 text-[12px] opacity-60">
          {entry.label} — no renderer
        </div>
      )
    }

    const own: Record<string, unknown> = {}
    for (const field of entry.fields) own[field.name] = props[field.name]

    const node: BlockNode = { id: _id, type: entry.type, props: own, children: [] }

    const note = placementNote(own)
    return (
      <div {...blockProps} {...styles}>
        {/* A fixed or absolute block would sit on top of the merchant's work and
            could not be selected around, so on the canvas it stays in place and
            says where it will go. "Preview" shows it there. */}
        {note && (
          <span className="pointer-events-none mb-1 inline-block rounded-full bg-[#141414] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {note}
          </span>
        )}
        {renderer(node, {
          ...canvasContext,
          editing: true,
          // ChaiBuilder has already rendered and wrapped the children; the
          // renderer only decides where they go.
          renderChildren: () => children ?? null,
        })}
      </div>
    )
  }
}

/**
 * One block's fields as a JSON Schema, which is what ChaiBuilder's inspector
 * is generated from.
 *
 * The `kind` on each field is the same value that drives coercion on the
 * server, so the control a merchant sees and the rule their input is checked
 * against come from one declaration. A `url` field gets a URL input here and
 * an allowlist there; they cannot drift, because neither is written twice.
 */
function schemaFor(entry: CatalogueEntry): Record<string, any> {
  const properties: Record<string, any> = {
    // What the Styles tab edits.
    //
    // Without a `styles` property the right-hand panel has nothing to show and
    // the tab is permanently empty — which reads as the styling being broken
    // rather than as the block not having declared any. The value is a class
    // string the component spreads onto its root element; `stylesProp` is what
    // makes the editor treat it as styling rather than as a text field.
    styles: stylesProp(''),
  }

  for (const field of entry.fields) {
    properties[field.name] = fieldSchema(field)
  }
  return properties
}

function fieldSchema(field: CatalogueField): Record<string, any> {
  const base = {
    title: field.label,
    description: field.help || undefined,
    default: field.default,
  }

  switch (field.kind) {
    case 'boolean':
      return { ...base, type: 'boolean', default: Boolean(field.default) }

    case 'number':
      return {
        ...base,
        type: 'number',
        default: Number(field.default) || 0,
        minimum: field.minimum ?? undefined,
        maximum: field.maximum ?? undefined,
      }

    case 'select':
    case 'collection':
    case 'product':
      // The same control for all three. `select`'s choices are fixed by the
      // registry; `collection` and `product` have theirs filled in from the
      // store's own catalogue by `withCatalogueOptions` — which has to run
      // *before* registration, because a schema's `enum` is read once when the
      // block is registered and there is no later hook to add to it.
      return {
        ...base,
        type: 'string',
        enum: field.options.map((option) => option.value),
        // RJSF reads the labels from here, so a merchant picks "Generous"
        // rather than "lg". No `ui:widget`: an enum already renders as a
        // select, and naming one that is not registered throws.
        enumNames: field.options.map((option) => option.label),
      }

    // Only widgets the editor actually registers may be named here. Anything
    // else throws `No widget '<name>' for type 'string'` at render time and
    // takes the whole settings panel down with it — which is how `link` and
    // `color`, invented from what the fields are *called*, broke every block
    // that had a URL on it. The registered set is: textarea, richtext, image,
    // icon, code, hidden, collectionSelect, colCount, repeaterBinding.
    case 'textarea':
      return { ...base, type: 'string', ui: { 'ui:widget': 'textarea' } }

    case 'richtext':
      return { ...base, type: 'string', ui: { 'ui:widget': 'richtext' } }

    case 'image':
      return { ...base, type: 'string', ui: { 'ui:widget': 'image' } }

    case 'color':
      // Our swatch-and-hex control (`fields.tsx`). The value is still checked
      // against a hex pattern on the server.
      return { ...base, type: 'string', ui: { 'ui:widget': 'commerceColor' } }

    case 'table':
      // Declared as a string, not an array: the library draws every array as a
      // collapsed row behind a chevron, which is how a table's cells came to
      // be somewhere nobody found. Our field draws the value, whatever its
      // declared type; the server owns the real shape.
      return {
        ...base,
        type: 'string',
        default: Array.isArray(field.default) ? field.default : [],
        ui: { 'ui:field': 'commerceTable' },
      }

    case 'url':
      // Likewise plain. The allowlist that matters — http, https, a
      // root-relative path, mailto, tel — is enforced in `sanitise`, not by
      // whichever control the merchant typed into.
      return { ...base, type: 'string', ui: { 'ui:placeholder': '/products' } }

    case 'list':
      // Our card editor, for the same reason as `table` above. The sub-fields
      // travel in `ui:options` so the cards draw the registry's own inputs.
      return {
        ...base,
        type: 'string',
        default: Array.isArray(field.default) ? field.default : [],
        ui: {
          'ui:field': 'commerceItems',
          'ui:options': { fields: field.fields, noun: nounFor(field.label) },
        },
      }

    default:
      return { ...base, type: 'string', default: String(field.default ?? '') }
  }
}

/**
 * Fill in the options for the `collection` and `product` field kinds.
 *
 * Called before registration, because a JSON Schema's `enum` is read once when
 * the block is registered — the store's own collections have to be in it by
 * then, and there is no later hook to add them.
 */
export function withCatalogueOptions(
  catalogue: CatalogueEntry[],
  collections: { id: string; title: string }[],
  products: { id: string; title: string }[],
): CatalogueEntry[] {
  return catalogue.map((entry) => ({
    ...entry,
    fields: entry.fields.map((field) => {
      if (field.kind === 'collection') {
        return { ...field, options: asOptions(collections) }
      }
      if (field.kind === 'product') {
        return { ...field, options: asOptions(products) }
      }
      return field
    }),
  }))
}

function asOptions(rows: { id: string; title: string }[]) {
  // A leading blank, so "no collection in particular" is a choice a merchant
  // can make and go back to rather than a state they can only leave.
  return [{ value: '', label: '— None —' }, ...rows.map((row) => ({ value: row.id, label: row.title }))]
}

/** A copy of a tree with a new id on every block. */
function withFreshIds(tree: BlockNode[]): BlockNode[] {
  return tree.map((node) => ({
    ...node,
    id: `b_${Math.random().toString(36).slice(2, 12)}`,
    props: { ...node.props },
    children: withFreshIds(node.children ?? []),
  }))
}

/** "Points" → "point", for the Add button. Good enough for our own labels. */
function nounFor(label: string) {
  const word = label.trim().split(/\s+/).pop()?.toLowerCase() ?? 'item'
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  return word.endsWith('s') ? word.slice(0, -1) : word
}
