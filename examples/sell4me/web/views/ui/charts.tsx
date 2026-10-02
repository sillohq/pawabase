/**
 * Charts, drawn as SVG. No charting library.
 *
 * Three forms, and the reasoning behind each:
 *
 * - `AreaChart` — revenue and orders over time. **One series**, so there is no
 *   legend (the panel title names it) and no categorical palette to get wrong.
 *   Two measures of different scale are never put on one plot with two y-axes;
 *   they get two charts.
 * - `BarList` — a breakdown by category. Magnitude, not identity, so every bar
 *   is the **same hue**: colouring a single-measure bar chart by category is
 *   colour used for decoration, and it makes the reader look for a meaning that
 *   is not there. The category is the row label.
 * - `Sparkline` — a trend inside a stat tile, no axes, no interaction.
 *
 * The series hue is `--color-accent`, validated against both the light and dark
 * chart surfaces (contrast >= 3:1 in each). Grid and axes are deliberately
 * recessive; text wears text tokens rather than the series colour.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cx } from '@/js/hooks'
import { Empty } from './kit'

type Point = { label: string; value: number; display: string }

/* ----------------------------------------------------------------- helpers */

/**
 * A y-axis that ends on a round number.
 *
 * A max of 4,873 gives ticks at 5,000 / 2,500 / 0 rather than at 4,873 and
 * half of it — axis labels are read, and reading 2,436.5 costs the reader
 * something for nothing.
 */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalised = value / magnitude
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10
  return step * magnitude
}

/** A monotone-ish cubic path. Smoothed just enough to read as a trend, not so
 *  much that it invents peaks between the points it was given. */
function linePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
  const parts = [`M ${points[0]!.x} ${points[0]!.y}`]
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]!
    const current = points[i]!
    const midX = (previous.x + current.x) / 2
    parts.push(`C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`)
  }
  return parts.join(' ')
}

/* -------------------------------------------------------------- area chart */

export function AreaChart({
  points,
  height = 200,
  valueLabel,
  emptyTitle = 'No data yet',
  emptyBody,
}: {
  points: Point[]
  height?: number
  /** What the y-axis measures, for the tooltip and the accessible summary. */
  valueLabel: string
  emptyTitle?: string
  emptyBody?: string
}) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)

  // Drawn at the size it is shown. It used to be a 1000-unit viewBox stretched
  // to fit, which shrank the axis text to a few pixels in a narrow card and
  // stretched it in a wide one. Measuring the container keeps every label at a
  // readable 12px and the plot proportional whatever the layout.
  const box = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState(0)
  useEffect(() => {
    const node = box.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setMeasured(Math.floor(entry?.contentRect.width ?? 0)))
    observer.observe(node)
    setMeasured(Math.floor(node.getBoundingClientRect().width))
    return () => observer.disconnect()
  }, [])
  const width = Math.max(measured, 260)

  const shape = useMemo(() => {
    const padding = { top: 16, right: 12, bottom: 30, left: 48 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom
    const max = niceMax(Math.max(...points.map((p) => p.value), 0))

    const coords = points.map((point, index) => ({
      x:
        padding.left +
        (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
      y: padding.top + plotHeight - (point.value / max) * plotHeight,
    }))

    return { padding, plotWidth, plotHeight, max, coords }
  }, [points, height, width])

  if (points.length === 0) {
    return <Empty title={emptyTitle} body={emptyBody} />
  }

  const { padding, plotWidth, plotHeight, max, coords } = shape
  const line = linePath(coords)
  const area =
    `${line} L ${coords[coords.length - 1]!.x} ${padding.top + plotHeight}` +
    ` L ${coords[0]!.x} ${padding.top + plotHeight} Z`

  // Four gridlines including the baseline: enough to judge a value against,
  // few enough to stay behind the data.
  const ticks = [0, 0.5, 1].map((fraction) => ({
    y: padding.top + plotHeight - fraction * plotHeight,
    value: max * fraction,
  }))

  // At most eight date labels, however many points there are — a 90-day series
  // with a label per day is an unreadable smear.
  const labelEvery = Math.max(1, Math.ceil(points.length / 8))
  const active = hover === null ? null : points[hover]

  return (
    <div ref={box} className="relative w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        role="img"
        aria-label={`${valueLabel} from ${points[0]!.label} to ${points[points.length - 1]!.label}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = event.clientX - rect.left
          const fraction = (ratio - padding.left) / plotWidth
          const index = Math.round(fraction * (points.length - 1))
          setHover(Math.max(0, Math.min(points.length - 1, index)))
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--color-line)"
              strokeWidth="1"
              // The baseline is solid; the rest are dashed, so the zero line
              // reads as the floor rather than as one gridline among three.
              strokeDasharray={tick.value === 0 ? undefined : '3 4'}
            />
            <text
              x={padding.left - 8}
              y={tick.y + 3.5}
              textAnchor="end"
              className="fill-[var(--color-ink-muted)] text-[12px] tabular"
            >
              {tick.value >= 1000
                ? `${(tick.value / 1000).toFixed(tick.value >= 10000 ? 0 : 1)}k`
                : Math.round(tick.value)}
            </text>
          </g>
        ))}

        {/* Keyed on the path so a new range redraws the line from the start. */}
        <path key={`a-${area}`} d={area} fill={`url(#${gradientId})`} className="chart-area" />
        <path
          key={`l-${line}`}
          d={line}
          pathLength={1}
          className="chart-line"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) =>
          index % labelEvery === 0 ? (
            <text
              key={point.label}
              x={coords[index]!.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-[var(--color-ink-muted)] text-[12px]"
            >
              {point.label.slice(5)}
            </text>
          ) : null,
        )}

        {hover !== null && (
          <g>
            <line
              x1={coords[hover]!.x}
              x2={coords[hover]!.x}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke="var(--color-ink-faint)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* A surface-coloured ring around the marker, so it stays legible
                wherever it lands on the fill. */}
            <circle
              cx={coords[hover]!.x}
              cy={coords[hover]!.y}
              r="4.5"
              fill="var(--color-accent)"
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-0 rounded-xl bg-[var(--color-ink)] px-3 py-2 text-[var(--color-surface)]"
          style={{
            left: `${Math.min(Math.max(coords[hover!]!.x, 60), width - 60)}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-[11px] opacity-70">{active.label}</div>
          <div className="text-[14px] font-bold tabular">
            {active.display}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- bar list */

export function BarList({
  rows,
  emptyTitle = 'Nothing to show',
  emptyBody,
}: {
  rows: { label: string; value: number; display: string; hint?: string }[]
  emptyTitle?: string
  emptyBody?: string
}) {
  if (rows.length === 0) return <Empty title={emptyTitle} body={emptyBody} />

  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={row.label} className="group relative" title={`${row.label}: ${row.display}`}>
          <div className="relative flex items-center justify-between gap-3 rounded-[var(--radius-xs)] px-2 py-1.5">
            {/* The bar is behind the text rather than beside it: the label is
                what identifies the row, and a separate bar column would push
                the numbers off a narrow panel. */}
            <div
              className="absolute inset-y-0 left-0 rounded-[var(--radius-xs)] bg-[var(--color-accent)] opacity-[0.13] transition-[width] duration-300 group-hover:opacity-[0.2]"
              style={{ width: `${Math.max((row.value / max) * 100, 2)}%` }}
              aria-hidden
            />
            <span className="relative truncate text-[12.5px] text-[var(--color-ink)]">
              {row.label}
            </span>
            <span className="relative flex shrink-0 items-baseline gap-2">
              {row.hint && (
                <span className="text-[11.5px] text-[var(--color-ink-faint)]">{row.hint}</span>
              )}
              <span className="text-[12.5px] font-medium text-[var(--color-ink)] tabular">
                {row.display}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- sparkline */

export function Sparkline({
  values,
  className,
  height = 28,
}: {
  values: number[]
  className?: string
  height?: number
}) {
  if (values.length < 2) return null

  const width = 100
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1

  const coords = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - ((value - min) / span) * (height - 3) - 1.5,
  }))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cx('w-full', className)}
      style={{ height }}
      preserveAspectRatio="none"
      // Decorative: the number beside it is the information. A screen reader
      // announcing a hundred coordinates would be noise.
      aria-hidden
    >
      <path
        d={linePath(coords)}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* ------------------------------------------------------------ donut / meter */

/**
 * A single proportion, as a ring.
 *
 * One value against a whole — a conversion rate, a fulfilment percentage.
 * Never used for a breakdown of several categories: a reader cannot compare
 * arc lengths, which is what `BarList` is for.
 */
export function Meter({
  value,
  label,
  caption,
  tone = 'accent',
}: {
  /** 0–1. `null` renders as "not enough data" rather than as zero. */
  value: number | null
  label: string
  caption?: string
  tone?: 'accent' | 'positive' | 'critical'
}) {
  const size = 92
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = value === null ? 0 : Math.max(0, Math.min(1, value))

  const COLOR = {
    accent: 'var(--color-accent)',
    positive: 'var(--color-positive)',
    critical: 'var(--color-critical)',
  }[tone]

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLOR}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${fraction * circumference} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        <text
          x={size / 2}
          y={size / 2 + 5}
          textAnchor="middle"
          className="fill-[var(--color-ink)] text-[16px] font-semibold tabular"
        >
          {value === null ? '—' : `${(fraction * 100).toFixed(1)}%`}
        </text>
      </svg>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--color-ink)]">{label}</div>
        {caption && (
          <div className="text-[12px] text-[var(--color-ink-soft)]">{caption}</div>
        )}
        {value === null && (
          <div className="mt-0.5 text-[12px] text-[var(--color-ink-faint)]">
            Not enough data yet
          </div>
        )}
      </div>
    </div>
  )
}
