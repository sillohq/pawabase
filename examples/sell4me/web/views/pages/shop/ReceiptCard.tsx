import { ShopButton } from '@/views/ui/shop'

export type ReceiptData = {
  store_name: string
  store_email: string | null
  store_lines: string[]
  number: number
  placed: string
  email: string
  method: string
  reference: string
  paid: boolean
  lines: { title: string; variant: string | null; quantity: number; unit: string; total: string }[]
  subtotal: string
  discount: string | null
  shipping: string | null
  tax: string | null
  total: string
  refunded: string | null
}

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace"

/** A till-roll receipt: torn top and bottom, dashed rules, a PAID stamp. The
 *  downloads are the same document drawn server-side, so what is saved is what
 *  is shown. */
export function ReceiptCard({ receipt, url }: { receipt: ReceiptData; url: string }) {
  const rule = <div className="my-4 border-t-2 border-dashed" style={{ borderColor: '#d8d0c8' }} />
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 text-[13px]"><span style={{ color: '#706a64' }}>{label}</span><span>{value}</span></div>
  )
  return (
    <div>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" />
      {/* The paper. The mask cuts a zigzag along the top and bottom edges. */}
      <div
        className="relative mx-auto max-w-[400px] px-7 pb-12 pt-11 text-[#141414]"
        style={{
          background: '#fff',
          fontFamily: MONO,
          WebkitMask:
            'conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/16px 51% repeat-x, conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top/16px 51% repeat-x',
          mask: 'conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom/16px 51% repeat-x, conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top/16px 51% repeat-x',
        }}
      >
        <div className="text-center">
          <div className="text-[20px] font-bold uppercase tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{receipt.store_name}</div>
          {receipt.store_lines.map((l) => <div key={l} className="mt-1 text-[11px]" style={{ color: '#706a64' }}>{l}</div>)}
          {receipt.store_email && <div className="text-[11px]" style={{ color: '#706a64' }}>{receipt.store_email}</div>}
        </div>
        {rule}
        <div className="grid gap-1.5 text-[12px]">
          {([['RECEIPT', `#${receipt.number}`], ['DATE', receipt.placed], ['EMAIL', receipt.email], ['PAID VIA', receipt.method]] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><span style={{ color: '#706a64' }}>{k}</span><span className="text-right">{v}</span></div>
          ))}
        </div>
        {rule}
        <div className="grid gap-3.5">
          {receipt.lines.map((l, i) => (
            <div key={i}>
              <div className="flex justify-between gap-4 text-[13px] font-semibold"><span>{l.title}</span><span className="shrink-0">{l.total}</span></div>
              {l.variant && <div className="text-[11px]" style={{ color: '#706a64' }}>{l.variant}</div>}
              <div className="text-[11px]" style={{ color: '#706a64' }}>{l.quantity} x {l.unit}</div>
            </div>
          ))}
        </div>
        {rule}
        <div className="grid gap-1.5">
          {row('Subtotal', receipt.subtotal)}
          {receipt.discount && row('Discount', receipt.discount)}
          {receipt.shipping && row('Shipping', receipt.shipping)}
          {receipt.tax && row('Tax', receipt.tax)}
        </div>
        <div className="my-4 border-t-2 border-dashed" style={{ borderColor: '#141414' }} />
        <div className="flex items-end justify-between gap-4">
          <span className="text-[13px] font-semibold">TOTAL</span>
          <span className="text-[24px] font-semibold tracking-tight">{receipt.total}</span>
        </div>
        {receipt.refunded && <div className="mt-2">{row('Refunded', `-${receipt.refunded}`)}</div>}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-w-0 text-[11px]"><div style={{ color: '#706a64' }}>REF</div><div className="truncate">{receipt.reference}</div></div>
          {receipt.paid && (
            <span className="shrink-0 rotate-[-8deg] rounded-[10px] border-[3px] px-4 py-1 text-[22px] font-extrabold tracking-wide" style={{ borderColor: '#4f7f66', color: '#4f7f66', fontFamily: 'Inter, system-ui, sans-serif' }}>PAID</span>
          )}
        </div>
        {rule}
        <p className="text-center text-[13px]">Thank you for your order</p>
        <p className="mt-1 text-center text-[11px]" style={{ color: '#706a64' }}>Keep this receipt as proof of purchase.</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ShopButton download href={`${url}/png?download=1`}>Download image</ShopButton>
        <ShopButton download href={`${url}/pdf?download=1`} variant="outline">Download PDF</ShopButton>
      </div>
    </div>
  )
}
