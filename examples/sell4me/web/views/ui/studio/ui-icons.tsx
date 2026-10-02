import type { SVGProps } from 'react'

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const TypeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7V5h16v2M12 5v14M9 19h6" /></svg>
)
export const LayersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
)
export const FrameIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M8 3v2M16 3v2M8 19v2M16 19v2" /></svg>
)
export const ShapesIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="8" cy="8" r="4.5" /><rect x="11" y="11" width="10" height="10" rx="1" /></svg>
)
export const SmileIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></svg>
)
export const AlignIcon = ({ kind, ...p }: { kind: 'left' | 'center' | 'right' } & SVGProps<SVGSVGElement>) => {
  const rows = kind === 'left' ? [[4, 20], [4, 14], [4, 18]] : kind === 'right' ? [[4, 20], [10, 20], [6, 20]] : [[4, 20], [7, 17], [5, 19]]
  return (
    <svg {...base(p)}>
      {rows.map(([a, b], i) => <path key={i} d={`M${a} ${7 + i * 5}H${b}`} />)}
    </svg>
  )
}
export const UndoIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
)
export const RedoIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
)

/** 24-unit thumbnails for the Elements panel shapes, drawn as SVG rather than typed characters. */
const poly = (sides: number, inner?: number) => {
  const count = inner ? sides * 2 : sides
  return Array.from({ length: count }, (_, i) => {
    const r = inner && i % 2 ? 9 * inner : 9
    const a = (Math.PI * 2 * i) / count - Math.PI / 2
    return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

export function ShapeThumb({ kind }: { kind: string }) {
  const props = { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'currentColor' }
  switch (kind) {
    case 'box': return <svg {...props}><rect x="3" y="5" width="18" height="14" /></svg>
    case 'rounded': return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="4" /></svg>
    case 'pill': return <svg {...props}><rect x="2" y="8" width="20" height="8" rx="4" /></svg>
    case 'circle': return <svg {...props}><circle cx="12" cy="12" r="9" /></svg>
    case 'ring': return <svg {...props} fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="8" /></svg>
    case 'triangle': return <svg {...props}><polygon points={poly(3)} /></svg>
    case 'diamond': return <svg {...props}><polygon points={poly(4)} /></svg>
    case 'pentagon': return <svg {...props}><polygon points={poly(5)} /></svg>
    case 'hexagon': return <svg {...props}><polygon points={poly(6)} /></svg>
    case 'star': return <svg {...props}><polygon points={poly(5, 0.45)} /></svg>
    case 'burst': return <svg {...props}><polygon points={poly(14, 0.8)} /></svg>
    case 'heart': return <svg {...props}><path d="M12 21C4 14 2 10 2 7.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 10 1.5C22 10 20 14 12 21Z" /></svg>
    case 'arrow': return <svg {...props}><path d="M3 9h10V4l8 8-8 8v-5H3Z" /></svg>
    case 'bolt': return <svg {...props}><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></svg>
    case 'bubble': return <svg {...props}><path d="M5 3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-7l-5 4v-4H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" /></svg>
    case 'cross': return <svg {...props}><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" /></svg>
    case 'ribbon': return <svg {...props}><polygon points="2,6 22,6 19,12 22,18 2,18 5,12" /></svg>
    case 'wave': return <svg {...props}><path d="M2 12q3-6 5.5 0t5.5 0 5.5 0 3.5 0V20H2Z" /></svg>
    default: return <svg {...props}><rect x="3" y="5" width="18" height="14" /></svg>
  }
}
