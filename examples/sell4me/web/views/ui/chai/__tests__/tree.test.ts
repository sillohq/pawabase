/**
 * The seam between our nested tree and ChaiBuilder's flat list.
 *
 * These are the tests that matter most in the builder, because this is the one
 * place a merchant's work can be lost *silently*: a block that fails to
 * convert does not throw, it just is not in the page any more, and nobody
 * finds out until a customer looks at the shop.
 */

import { describe, expect, it } from 'vitest'
import type { ChaiBlock } from '@chaibuilder/runtime'
import type { BlockNode } from '@/views/ui/blocks'
import { fromChai, toChai } from '../tree'

/**
 * A block as the *server* produces it.
 *
 * `styles` is always present, because `sanitise` writes it on every block —
 * so a fixture without it is not a tree this code ever sees, and a round-trip
 * test built on one would be testing a shape that does not exist.
 */
const node = (
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  children: BlockNode[] = [],
): BlockNode => ({ id, type, props: { styles: '', ...props }, children })

/**
 * A ChaiBlock fixture.
 *
 * `ChaiBlock<T>` defaults `T` to `Record<string, string>`, so a literal with a
 * `_parent: null` in it does not structurally match and a direct `as` cast is
 * rejected. Built through a function typed on the loose shape instead, which
 * keeps the fixtures readable and still type-checked.
 */
const chai = (fields: Record<string, unknown>): ChaiBlock =>
  fields as unknown as ChaiBlock

describe('toChai', () => {
  it('flattens a nested tree, naming each block its parent', () => {
    const flat = toChai([
      node('s1', 'section', { padding: 'lg' }, [
        node('h1', 'heading', { text: 'Hello' }),
        node('t1', 'text', { body: 'World' }),
      ]),
    ])

    expect(flat.map((block) => [block._id, block._parent])).toEqual([
      ['s1', null],
      ['h1', 's1'],
      ['t1', 's1'],
    ])
  })

  it('emits a child after its parent and before the parent’s next sibling', () => {
    // ChaiBuilder reads order from the array, so depth-first is not a detail:
    // breadth-first would draw the outline panel in an order nobody arranged.
    const flat = toChai([
      node('s1', 'section', {}, [node('h1', 'heading')]),
      node('s2', 'section', {}, [node('h2', 'heading')]),
    ])
    expect(flat.map((block) => block._id)).toEqual(['s1', 'h1', 's2', 'h2'])
  })

  it('carries props across', () => {
    const [block] = toChai([node('h1', 'heading', { text: 'Hi', level: 'h2' })])
    expect(block).toMatchObject({ _id: 'h1', _type: 'heading', text: 'Hi', level: 'h2' })
  })
})

describe('fromChai', () => {
  it('rebuilds the nesting', () => {
    const tree = fromChai([
      chai({ _id: 's1', _type: 'section', _parent: null, padding: 'lg' }),
      chai({ _id: 'h1', _type: 'heading', _parent: 's1', text: 'Hello' }),
    ])

    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('s1')
    expect(tree[0].children.map((child) => child.id)).toEqual(['h1'])
  })

  it('never stores ChaiBuilder’s bookkeeping as a block prop', () => {
    // `_id`, `_type`, `_parent` live in the same object as the props. Spreading
    // the block would put them in our database, where the server's sanitiser
    // drops them on the next save — silently, and the editor would look like
    // it had lost state it never had.
    const [block] = fromChai([
      chai({ _id: 'h1', _type: 'heading', _parent: null, _name: 'Title', text: 'Hi' }),
    ])

    expect(block.props).toEqual({ text: 'Hi' })
    expect(Object.keys(block.props)).not.toContain('_id')
    expect(Object.keys(block.props)).not.toContain('_name')
  })

  it('lifts an orphan to the root rather than dropping it', () => {
    // A block in the wrong place is recoverable. A block a merchant cannot
    // find is not.
    const tree = fromChai([
      chai({ _id: 'h1', _type: 'heading', _parent: 'gone', text: 'Orphan' }),
    ])

    expect(tree.map((block) => block.id)).toEqual(['h1'])
  })

  it('breaks a parent cycle instead of recursing forever', () => {
    const tree = fromChai([
      chai({ _id: 'a', _type: 'section', _parent: 'b' }),
      chai({ _id: 'b', _type: 'section', _parent: 'a' }),
    ])

    // Whatever it decides, it must terminate and keep both blocks reachable.
    const ids: string[] = []
    const walk = (nodes: BlockNode[]) => {
      for (const entry of nodes) {
        ids.push(entry.id)
        walk(entry.children)
      }
    }
    walk(tree)
    expect(ids.sort()).toEqual(['a', 'b'])
  })

  it('skips a block with no id or no type', () => {
    const tree = fromChai([
      chai({ _id: '', _type: 'heading' }),
      chai({ _id: 'ok', _type: 'heading' }),
      chai({ _type: 'heading' }),
    ])

    expect(tree.map((block) => block.id)).toEqual(['ok'])
  })
})

describe('styles', () => {
  const MARKER = '#styles:,'

  it('is handed to the editor with the marker it looks for', () => {
    // Without it the styling panel does not recognise the value as styling and
    // renders an empty tab — which reads as "my styles disappeared".
    const [block] = toChai([node('a', 'heading', { styles: 'p-4 flex' })])
    expect((block as Record<string, unknown>).styles).toBe(`${MARKER}p-4 flex`)
  })

  it('is stored without it', () => {
    // The storefront renders from the stored tree and has never heard of the
    // marker. A published page must not carry a library's private encoding.
    const [block] = fromChai([
      chai({ _id: 'a', _type: 'heading', styles: `${MARKER}p-4 flex` }),
    ])
    expect(block.props.styles).toBe('p-4 flex')
  })

  it('does not double up the marker on a second trip', () => {
    const once = toChai([node('a', 'heading', { styles: 'p-4' })])
    const back = fromChai(once)
    const twice = toChai(back)
    expect((twice[0] as Record<string, unknown>).styles).toBe(`${MARKER}p-4`)
  })

  it('survives a value that arrives already decoded', () => {
    // A tree written before this translation existed, or by the API.
    const [block] = fromChai([chai({ _id: 'a', _type: 'heading', styles: 'p-4' })])
    expect(block.props.styles).toBe('p-4')
  })
})

describe('the round trip', () => {
  const original: BlockNode[] = [
    node('s1', 'section', { padding: 'lg', width: 'wide' }, [
      node('h1', 'heading', { text: 'Made to last', level: 'h1' }),
      node('c1', 'columns', { count: 2 }, [
        node('col1', 'column', { span: 1 }, [node('t1', 'text', { body: 'Left' })]),
        node('col2', 'column', { span: 1 }, [node('t2', 'text', { body: 'Right' })]),
      ]),
    ]),
    node('s2', 'section', { padding: 'md' }, [node('g1', 'product_grid', { limit: 4 })]),
  ]

  it('returns exactly what went in', () => {
    // The property that makes the seam safe: a merchant who opens the builder
    // and closes it without touching anything has changed nothing.
    expect(fromChai(toChai(original))).toEqual(original)
  })

  it('survives four levels of nesting', () => {
    const deep = [node('a', 'section', {}, [
      node('b', 'columns', {}, [node('c', 'column', {}, [node('d', 'text', { body: 'deep' })])]),
    ])]
    expect(fromChai(toChai(deep))).toEqual(deep)
  })

  it('is stable across two round trips', () => {
    const once = fromChai(toChai(original))
    expect(fromChai(toChai(once))).toEqual(once)
  })

  it('keeps an empty tree empty', () => {
    expect(fromChai(toChai([]))).toEqual([])
  })
})
