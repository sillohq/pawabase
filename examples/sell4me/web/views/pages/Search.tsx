import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { useDebounced } from '@/js/hooks'
import { Badge, Empty, PageHeader, Panel, SearchInput } from '@/views/ui/kit'
import { IconSearch } from '@/views/ui/icons'

type Result = {
  type: string
  id: number
  title: string
  subtitle: string
  url: string
  badge: string | null
}

export default function Search({ query, results }: { query: string; results: Result[] }) {
  const [term, setTerm] = useState(query)
  const settled = useDebounced(term, 300)

  useEffect(() => {
    if (settled === query) return
    router.get('/search', { q: settled }, { preserveState: true, preserveScroll: true, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  const grouped = results.reduce<Record<string, Result[]>>((groups, result) => {
    ;(groups[result.type] ??= []).push(result)
    return groups
  }, {})

  return (
    <>
      <Head title={query ? `Search: ${query}` : 'Search'} />
      <PageHeader
        title="Search"
        description="Across orders, products, customers, transactions and campaigns — only what your role can see."
      />

      <div className="mb-4 max-w-xl">
        <SearchInput value={term} onChange={setTerm} placeholder="Search everything…" />
      </div>

      {results.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconSearch className="h-6 w-6" />}
            title={term.length < 2 ? 'Start typing' : `Nothing matching “${term}”`}
            body={term.length < 2
              ? 'Two characters is enough. Press ⌘K anywhere for the same search.'
              : 'Try an order number, an email address, or part of a product title.'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, entries]) => (
            <Panel key={type} padded={false}>
              <div className="border-b border-[var(--color-line)] px-4 py-2.5">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--color-ink-faint)]">
                  {type}s
                </h2>
              </div>
              <div className="divide-y divide-[var(--color-line-soft)]">
                {entries.map((result) => (
                  <Link key={`${result.type}-${result.id}`} href={result.url}
                    className="row-hover flex items-center gap-3 px-4 py-2.5 transition-colors">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[var(--color-ink)]">
                        {result.title}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--color-ink-faint)]">
                        {result.subtitle}
                      </span>
                    </span>
                    {result.badge && <Badge>{result.badge.replace(/_/g, ' ')}</Badge>}
                  </Link>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}
