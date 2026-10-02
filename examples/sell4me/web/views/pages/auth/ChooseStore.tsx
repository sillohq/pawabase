import { Head, router } from '@inertiajs/react'
import { Badge } from '@/views/ui/kit'
import { IconChevronRight, IconPlus } from '@/views/ui/icons'

type StoreRow = { id: number; name: string; slug: string; role: string; status: string }

export default function ChooseStore({ stores }: { stores: StoreRow[] }) {
  return (
    <>
      <Head title="Choose a store" />
      <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Choose a store</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">
        You have access to {stores.length} {stores.length === 1 ? 'store' : 'stores'}.
      </p>

      <div className="mt-6 space-y-2">
        {stores.map((store) => (
          <button
            key={store.id}
            type="button"
            onClick={() => router.post('/switch-store', { store_id: store.id })}
            className="flex w-full items-center gap-3 rounded-2xl bg-sunken px-4 py-3.5 text-left transition hover:bg-line-soft"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-[14px] font-bold text-surface">
              {store.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-ink">{store.name}</span>
              <span className="block truncate text-[12px] text-ink-faint">
                {store.slug} · {store.role}
              </span>
            </span>
            {store.status !== 'active' && <Badge tone="caution">Draft</Badge>}
            <IconChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.visit('/onboarding?new=1')}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3.5 text-[13.5px] font-semibold text-ink-muted transition hover:border-brand hover:text-brand"
      >
        <IconPlus className="h-4 w-4" />
        Create another store
      </button>
    </>
  )
}
