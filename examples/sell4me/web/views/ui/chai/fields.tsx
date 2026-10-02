/**
 * Our own controls for the block settings panel.
 *
 * The library's form renders an array as a collapsed row behind a small
 * chevron, with its entries one click further in — so a table's cells and a
 * list's points were, in practice, somewhere a merchant never found. And it has
 * no colour control at all. These three replace those cases:
 *
 * - `commerceTable` — the cells of a table as a small spreadsheet, always open,
 *   with a paste from any spreadsheet filling it in one go.
 * - `commerceItems` — repeating entries (list points, links, FAQ questions) as
 *   cards with Add, move and remove, drawn from the registry's own sub-fields.
 * - `commerceColor` — a swatch, a hex field and a way back to "inherit".
 *
 * Each is registered with the editor once and named from a field's schema in
 * `register.tsx`. The value each writes is exactly the shape `sanitise`
 * accepts for its kind, so what the merchant types and what is stored cannot
 * disagree.
 */

import {
  registerBlockSettingField,
  registerBlockSettingWidget,
} from '@chaibuilder/sdk'
import { useEffect, useState } from 'react'
import type { ClipboardEvent, ReactNode } from 'react'

/** What RJSF hands a custom field. Only the parts used here. */
type FieldProps = {
  formData?: unknown
  onChange: (value: unknown, errorSchema?: unknown, id?: string) => void
  idSchema: { $id: string }
  schema: { title?: string; description?: string }
  uiSchema?: { 'ui:options'?: Record<string, unknown> }
}

type WidgetProps = {
  id: string
  value?: unknown
  onChange: (value: unknown) => void
  label?: string
  placeholder?: string
}

export type SubField = {
  name: string
  label: string
  kind: string
  default: unknown
  help?: string
  options?: { value: string; label: string }[]
}

const INPUT =
  'h-8 w-full min-w-0 rounded-[var(--radius-md)] border border-line bg-surface px-2.5 text-[12.5px] text-ink ' +
  'outline-none transition placeholder:text-ink-faint hover:border-ink-faint focus:border-brand focus:ring-3 focus:ring-brand-ring'

const TINY_BUTTON =
  'inline-flex h-7 items-center gap-1 rounded-[var(--radius-md)] border border-line bg-surface px-2 text-[11.5px] ' +
  'font-medium text-ink-muted transition hover:border-ink-faint hover:text-ink disabled:pointer-events-none disabled:opacity-40'

/**
 * The line under the field's label. The label itself is drawn by the editor's
 * own field template, so it is not repeated here — only the help and a count.
 */
function Label({ help, aside }: { help?: string; aside?: ReactNode }) {
  if (!help && !aside) return null
  return (
    <div className="mb-1.5 flex items-start justify-between gap-2">
      <p className="text-[11.5px] leading-snug text-ink-faint">{help}</p>
      {aside}
    </div>
  )
}

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

const PLUS = 'M8 3.5v9M3.5 8h9'
const CROSS = 'M4.5 4.5l7 7M11.5 4.5l-7 7'
const UP = 'M4.5 9.5L8 6l3.5 3.5'
const DOWN = 'M4.5 6.5L8 10l3.5-3.5'

/* -- table ------------------------------------------------------------------ */

const MAX_ROWS = 60
const MAX_COLUMNS = 12

function asGrid(value: unknown): string[][] {
  if (!Array.isArray(value)) return [['', ''], ['', '']]
  const rows = value.filter(Array.isArray).map((row) => row.map((cell) => String(cell ?? '')))
  const width = Math.max(1, ...rows.map((row) => row.length))
  return rows.length ? rows.map((row) => [...row, ...Array(width - row.length).fill('')]) : [['', '']]
}

function TableField({ formData, onChange, idSchema, schema }: FieldProps) {
  const grid = asGrid(formData)
  const width = grid[0]?.length ?? 1
  const commit = (next: string[][]) => onChange(next, undefined, idSchema.$id)

  const setCell = (row: number, column: number, text: string) =>
    commit(grid.map((cells, r) => (r === row ? cells.map((cell, c) => (c === column ? text : cell)) : cells)))

  const addRow = (at = grid.length) =>
    grid.length < MAX_ROWS && commit([...grid.slice(0, at), Array(width).fill(''), ...grid.slice(at)])
  const removeRow = (at: number) => grid.length > 1 && commit(grid.filter((_, index) => index !== at))
  const addColumn = () =>
    width < MAX_COLUMNS && commit(grid.map((cells) => [...cells, '']))
  const removeColumn = (at: number) =>
    width > 1 && commit(grid.map((cells) => cells.filter((_, index) => index !== at)))

  // A paste of more than one cell — from Sheets, Excel, Numbers — fills the
  // table from the cell it lands in, growing it as needed. A single value
  // pastes as ordinary text.
  const paste = (row: number, column: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return
    event.preventDefault()
    const pasted = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((line) => line.split('\t'))
    const rows = Math.min(MAX_ROWS, Math.max(grid.length, row + pasted.length))
    const columns = Math.min(MAX_COLUMNS, Math.max(width, column + Math.max(...pasted.map((line) => line.length))))
    const next = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: columns }, (_, c) => {
        const incoming = pasted[r - row]?.[c - column]
        return incoming !== undefined && r >= row && c >= column ? incoming : grid[r]?.[c] ?? ''
      }),
    )
    commit(next)
  }

  return (
    <div className="mb-4">
      <Label
        help={schema.description}
        aside={<span className="text-[11px] text-ink-faint">{grid.length} × {width}</span>}
      />
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line bg-sunken p-1.5">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-4" />
              {Array.from({ length: width }, (_, column) => (
                <th key={column} className="p-0">
                  <div className="flex items-center justify-between px-1 text-[10.5px] font-medium text-ink-faint">
                    {String.fromCharCode(65 + column)}
                    <button type="button" onClick={() => removeColumn(column)} disabled={width <= 1}
                            className="rounded p-0.5 hover:bg-surface hover:text-critical disabled:opacity-0"
                            aria-label={`Remove column ${String.fromCharCode(65 + column)}`}>
                      <Glyph d={CROSS} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((cells, row) => (
              <tr key={row}>
                <td className="p-0 text-center text-[10.5px] text-ink-faint">{row + 1}</td>
                {cells.map((cell, column) => (
                  <td key={column} className="p-0">
                    <input
                      value={cell}
                      onChange={(event) => setCell(row, column, event.target.value)}
                      onPaste={paste(row, column)}
                      aria-label={`Row ${row + 1}, column ${String.fromCharCode(65 + column)}`}
                      className={`${INPUT} h-7 min-w-[4.75rem] px-2 text-[12px] ${row === 0 ? 'font-medium' : ''}`}
                    />
                  </td>
                ))}
                <td className="p-0">
                  <button type="button" onClick={() => removeRow(row)} disabled={grid.length <= 1}
                          className="rounded p-1 text-ink-faint hover:bg-surface hover:text-critical disabled:opacity-0"
                          aria-label={`Remove row ${row + 1}`}>
                    <Glyph d={CROSS} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button type="button" className={TINY_BUTTON} onClick={() => addRow()} disabled={grid.length >= MAX_ROWS}>
          <Glyph d={PLUS} /> Row
        </button>
        <button type="button" className={TINY_BUTTON} onClick={addColumn} disabled={width >= MAX_COLUMNS}>
          <Glyph d={PLUS} /> Column
        </button>
      </div>
    </div>
  )
}

/* -- repeating items -------------------------------------------------------- */

function SubInput({
  field,
  value,
  onChange,
}: {
  field: SubField
  value: unknown
  onChange: (value: unknown) => void
}) {
  const text = value === undefined || value === null ? '' : String(value)
  if (field.kind === 'textarea') {
    return (
      <textarea value={text} rows={2} onChange={(event) => onChange(event.target.value)}
                className={`${INPUT} h-auto min-h-[3.25rem] resize-y py-1.5 leading-snug`} />
    )
  }
  if (field.kind === 'boolean') {
    return (
      <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)}
             className="h-4 w-4 accent-[var(--color-brand)]" />
    )
  }
  if (field.kind === 'select' && field.options?.length) {
    return (
      <select value={text} onChange={(event) => onChange(event.target.value)} className={INPUT}>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }
  return (
    <input
      value={text}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.kind === 'url' ? '/products or https://…' : field.kind === 'image' ? 'https://… image URL' : ''}
      className={INPUT}
    />
  )
}

function ItemsField({ formData, onChange, idSchema, schema, uiSchema }: FieldProps) {
  const fields = (uiSchema?.['ui:options']?.fields as SubField[] | undefined) ?? []
  const noun = (uiSchema?.['ui:options']?.noun as string | undefined) ?? 'item'
  const items = Array.isArray(formData) ? (formData as Record<string, unknown>[]) : []
  const [open, setOpen] = useState<number | null>(items.length <= 4 ? -1 : null)
  const commit = (next: Record<string, unknown>[]) => onChange(next, undefined, idSchema.$id)

  const blank = () => Object.fromEntries(fields.map((field) => [field.name, field.default ?? '']))
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commit(next)
  }

  // With a single text field the card is just that field — a list of points
  // should read like a list, not like a stack of forms.
  const single = fields.length === 1
  const summary = (item: Record<string, unknown>) =>
    String(item[fields[0]?.name ?? ''] ?? '').trim() || `Untitled ${noun}`

  return (
    <div className="mb-4">
      <Label
        help={schema.description}
        aside={<span className="text-[11px] text-ink-faint">{items.length}</span>}
      />
      <div className="space-y-1.5">
        {items.map((item, index) => {
          const expanded = single || open === -1 || open === index
          return (
            <div key={index} className="rounded-[var(--radius-md)] border border-line bg-surface">
              <div className="flex items-center gap-1 py-1 pr-1 pl-2">
                {single ? (
                  <div className="min-w-0 flex-1">
                    <SubInput field={fields[0]} value={item[fields[0].name]}
                              onChange={(value) => commit(items.map((row, r) => (r === index ? { ...row, [fields[0].name]: value } : row)))} />
                  </div>
                ) : (
                  <button type="button" onClick={() => setOpen(expanded && open !== -1 ? null : index)}
                          className="min-w-0 flex-1 truncate py-1 text-left text-[12.5px] font-medium text-ink">
                    {summary(item)}
                  </button>
                )}
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0}
                        className="rounded p-1 text-ink-faint hover:bg-sunken hover:text-ink disabled:opacity-30" aria-label="Move up">
                  <Glyph d={UP} />
                </button>
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === items.length - 1}
                        className="rounded p-1 text-ink-faint hover:bg-sunken hover:text-ink disabled:opacity-30" aria-label="Move down">
                  <Glyph d={DOWN} />
                </button>
                <button type="button" onClick={() => commit(items.filter((_, r) => r !== index))}
                        className="rounded p-1 text-ink-faint hover:bg-sunken hover:text-critical" aria-label={`Remove ${noun}`}>
                  <Glyph d={CROSS} />
                </button>
              </div>
              {!single && expanded && (
                <div className="space-y-2 border-t border-line-soft px-2.5 pt-2 pb-2.5">
                  {fields.map((field) => (
                    <label key={field.name} className="block">
                      <span className="mb-1 block text-[11.5px] text-ink-muted">{field.label}</span>
                      <SubInput field={field} value={item[field.name]}
                                onChange={(value) => commit(items.map((row, r) => (r === index ? { ...row, [field.name]: value } : row)))} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className={`${TINY_BUTTON} mt-2 w-full justify-center border-dashed`}
        disabled={items.length >= 20}
        onClick={() => {
          commit([...items, blank()])
          setOpen(items.length)
        }}
      >
        <Glyph d={PLUS} /> Add {noun}
      </button>
    </div>
  )
}

/* -- colour ----------------------------------------------------------------- */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function ColorWidget({ id, value, onChange }: WidgetProps) {
  const current = typeof value === 'string' ? value : ''
  const [draft, setDraft] = useState(current)
  useEffect(() => setDraft(current), [current])

  return (
    <div className="flex items-center gap-1.5">
      <label
        className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-md)] border border-line"
        style={{
          background: HEX.test(current)
            ? current
            : 'repeating-conic-gradient(var(--color-line) 0 25%, var(--color-surface) 0 50%) 0 0 / 10px 10px',
        }}
        title="Pick a colour"
      >
        <input
          type="color"
          value={HEX.test(current) && current.length === 7 ? current : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        id={id}
        value={draft}
        placeholder="Inherit from theme"
        onChange={(event) => {
          setDraft(event.target.value)
          if (event.target.value === '' || HEX.test(event.target.value)) onChange(event.target.value)
        }}
        className={`${INPUT} font-mono text-[12px] uppercase placeholder:font-sans placeholder:normal-case`}
      />
      {current && (
        <button type="button" onClick={() => onChange('')} className="rounded p-1.5 text-ink-faint hover:bg-sunken hover:text-ink"
                aria-label="Clear colour" title="Inherit from theme">
          <Glyph d={CROSS} />
        </button>
      )}
    </div>
  )
}

let registered = false

/** Register the controls with the editor. Global, so once. */
export function registerSettingControls() {
  if (registered) return
  registered = true
  registerBlockSettingField('commerceTable', TableField)
  registerBlockSettingField('commerceItems', ItemsField)
  registerBlockSettingWidget('commerceColor', ColorWidget)
}
