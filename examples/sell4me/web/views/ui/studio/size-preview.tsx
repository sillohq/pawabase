export function SizePreview({ width, height, box = 56, active = false }: { width: number; height: number; box?: number; active?: boolean }) {
  const scale = box / Math.max(width, height)
  return (
    <span className="flex items-center justify-center" style={{ width: box, height: box }}>
      <span className={`border ${active ? 'border-ink bg-ink/10' : 'border-ink-faint bg-sunken'}`} style={{ width: Math.max(6, width * scale), height: Math.max(6, height * scale) }} />
    </span>
  )
}
