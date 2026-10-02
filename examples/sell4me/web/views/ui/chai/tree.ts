/**
 * Between our nested tree and ChaiBuilder's flat list.
 *
 * The two formats describe the same thing and disagree about how:
 *
 *     ours   {id, type, props, children: [...]}   nested
 *     chai   {_id, _type, _parent, ...props}      flat, order = array order
 *
 * Neither is wrong. Ours is nested because the *server* owns it: a nested tree
 * validates by recursion, caps its own depth, and cannot describe a cycle —
 * `sanitise` relies on all three. ChaiBuilder's is flat because the *editor*
 * owns it: moving a block is one field, and every operation is O(1) against a
 * lookup rather than a walk.
 *
 * So this module is the seam, and it is a pure function on both sides — no
 * React, no network — because a seam you can test with a value in and a value
 * out is one that stays correct. `tests/` has the round trip.
 *
 The one rule worth stating: **props are copied by name, never by spread of
 * the whole block.** A ChaiBuilder block carries `_id`, `_type`, `_parent` and
 * `_bindings` in the same object as its props, and spreading that into `props`
 * would store ChaiBuilder's bookkeeping in our database — where the server's
 * sanitiser would drop it on the next save, silently, and the editor would
 * appear to lose state it never actually had.
 *
 * The `styles` prop is translated here for the same reason. The editor encodes
 * a block's classes as `#styles:,p-4 flex` — a marker the styling panel looks
 * for to know a value is styling rather than text. Our database stores the
 * plain class list, because the *storefront* renders from that tree and has
 * never heard of the marker. Keeping the encoding inside this file is what
 * lets both be true; storing the prefixed form would put a library's private
 * format on every published page.
 *
 * Getting this wrong looks exactly like the styling silently not working: the
 * classes save, reload, and render — and the Style tab is blank, because the
 * value it reads back has no marker on it.
 */

import type { ChaiBlock } from '@chaibuilder/runtime'
import type { BlockNode } from '@/views/ui/blocks'

/** ChaiBuilder's own fields, which are never props of ours. */
const RESERVED = new Set(['_id', '_type', '_parent', '_name', '_bindings'])

/** The marker the editor's styling panel looks for. See the module docstring. */
const STYLES_MARKER = '#styles:,'

/** Our plain class list, in the shape the editor expects. */
function encodeStyles(value: unknown): string {
  const classes = typeof value === 'string' ? value.replace(STYLES_MARKER, '').trim() : ''
  return `${STYLES_MARKER}${classes}`
}

/** The editor's value, back to a plain class list. */
function decodeStyles(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.startsWith(STYLES_MARKER) ? value.slice(STYLES_MARKER.length).trim() : value.trim()
}

/**
 * Our nested tree, flattened for the editor.
 *
 * Depth-first, because ChaiBuilder reads order from the array: a child must
 * appear after its parent and before the parent's next sibling, or the outline
 * panel draws the page in an order nobody arranged.
 */
export function toChai(tree: BlockNode[]): ChaiBlock[] {
  const out: ChaiBlock[] = []

  function walk(nodes: BlockNode[], parent: string | null) {
    for (const node of nodes) {
      out.push({
        _id: node.id,
        _type: node.type,
        _parent: parent,
        ...node.props,
        styles: encodeStyles(node.props.styles),
      } as ChaiBlock)
      if (node.children?.length) walk(node.children, node.id)
    }
  }

  walk(tree, null)
  return out
}

/**
 * The editor's flat list, back to our nested tree.
 *
 * Two things here are defensive rather than decorative, and both have been the
 * bug in every builder that skipped them:
 *
 * * A block whose `_parent` names something not in the list would vanish. It
 *   is lifted to the root instead — a block in the wrong place is recoverable,
 *   a block a merchant cannot find is not.
 * * A parent chain that loops would recurse forever. `seen` breaks it, and the
 *   blocks below the loop are dropped rather than hanging the tab.
 *
 * The server sanitises this again on arrival regardless. This is about not
 * losing a merchant's work between their canvas and the request.
 */
export function fromChai(blocks: ChaiBlock[]): BlockNode[] {
  const byId = new Map<string, BlockNode>()
  const order: ChaiBlock[] = []

  for (const block of blocks) {
    if (!block?._id || !block?._type) continue
    const props: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(block)) {
      if (RESERVED.has(key)) continue
      props[key] = key === 'styles' ? decodeStyles(value) : value
    }
    byId.set(block._id, { id: block._id, type: block._type, props, children: [] })
    order.push(block)
  }

  const roots: BlockNode[] = []

  for (const block of order) {
    const node = byId.get(block._id)
    if (!node) continue

    const parentId = block._parent
    const parent = parentId ? byId.get(parentId) : undefined

    if (!parent || parent === node || descends(parent, node, byId, order)) {
      roots.push(node)
      continue
    }
    parent.children.push(node)
  }

  return roots
}

/**
 * Whether `parent` is somewhere below `node` — i.e. attaching one to the other
 * would close a loop.
 *
 * Walks up from the candidate parent looking for the node itself. Bounded by
 * `seen`, so a list that already contains a cycle is answered rather than
 * followed round.
 */
function descends(
  parent: BlockNode,
  node: BlockNode,
  byId: Map<string, BlockNode>,
  order: ChaiBlock[],
): boolean {
  const parentOf = new Map(order.map((block) => [block._id, block._parent ?? null]))
  const seen = new Set<string>()

  let current: string | null | undefined = parent.id
  while (current) {
    if (current === node.id) return true
    if (seen.has(current)) return true
    seen.add(current)
    current = parentOf.get(current) ?? null
    if (current && !byId.has(current)) return false
  }
  return false
}
