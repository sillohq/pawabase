import { Head, router, usePoll } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { dateTime, useCan } from '@/js/hooks'
import {
  Badge, Banner, Button, Empty, Field, Panel, PanelHeader, PageHeader,
  Select, StatusBadge, TBody, TD, TH, THead, TR, Table,
} from '@/views/ui/kit'
import { IconDownload, IconFile } from '@/views/ui/icons'

type ExportJob = {
  id: number
  resource: string
  status: string
  row_count: number
  file_size: number | null
  error: string | null
  requested_by: string | null
  created_at: string | null
  completed_at: string | null
  expires_at: string | null
  download_url: string | null
}

type Props = {
  exports: ExportJob[]
  resources: { key: string; label: string }[]
}

function fileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Exports({ exports: jobs, resources }: Props) {
  const can = useCan()
  const tableResources = resources.filter((entry) => entry.key !== 'full_report')
  const [resource, setResource] = useState(tableResources[0]?.key ?? 'orders')
  const [requesting, setRequesting] = useState(false)
  const [requestingReport, setRequestingReport] = useState(false)
  const labels = Object.fromEntries(resources.map((entry) => [entry.key, entry.label]))

  const running = jobs.some((job) => job.status === 'queued' || job.status === 'running')

  // While anything is still queued or running, check every couple of seconds
  // instead of leaving the page showing a stale "queued" until someone
  // reloads by hand. `only: ['exports']` re-fetches just this list — the page
  // header and permissions never change mid-poll, so there is nothing else
  // worth re-fetching.
  const poll = usePoll(2000, { only: ['exports'] }, { autoStart: false })
  useEffect(() => {
    if (running) poll.start()
    else poll.stop()
    return () => poll.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function queue(key: string, setBusy: (value: boolean) => void) {
    setBusy(true)
    router.post('/exports', { resource: key }, { preserveScroll: true, onFinish: () => setBusy(false) })
  }

  return (
    <>
      <Head title="Exports" />
      <PageHeader
        title="Exports"
        description="Plain CSVs for a single list, or one branded workbook with every part of the store in it."
      />

      {can('reports.export') && (
        <>
          <div className="mb-4 overflow-hidden rounded-[var(--radius)] bg-[var(--color-ink)] text-white">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12">
                  <IconFile className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold">Complete store export</h2>
                  <p className="mt-0.5 max-w-md text-[12.5px] text-white/70">
                    Every part of your store, in one Excel workbook — orders, products,
                    collections, customers, segments, discounts, campaigns, inventory, shipping,
                    transactions, payouts, refunds, the ledger and your team. Not a summary: full,
                    sortable, filterable data, ready to work in.
                  </p>
                </div>
              </div>
              <Button
                tone="primary"
                loading={requestingReport}
                onClick={() => queue('full_report', setRequestingReport)}
                className="!bg-white !text-[var(--color-ink)] hover:!bg-white/90"
              >
                <IconDownload className="h-3.5 w-3.5" />
                Generate report
              </Button>
            </div>
          </div>

          <Panel className="mb-4">
            <PanelHeader title="Export a single list" />
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field label="What to export" className="min-w-52">
                <Select value={resource} onChange={(event) => setResource(event.target.value)}>
                  {tableResources.map((entry) => (
                    <option key={entry.key} value={entry.key}>{entry.label}</option>
                  ))}
                </Select>
              </Field>
              <Button loading={requesting} onClick={() => queue(resource, setRequesting)}>
                Queue export
              </Button>
            </div>
            <p className="mt-2 text-[11.5px] text-[var(--color-ink-faint)]">
              You can only export what your role can read. Files are deleted after 48 hours —
              they hold customer data.
            </p>
          </Panel>
        </>
      )}

      {running && (
        <div className="mb-4">
          <Banner tone="info" title="An export is being produced">
            This will update on its own the moment it's ready. If it sits here for more than a
            minute, no background worker is running — start one with{' '}
            <code className="font-[family-name:var(--font-mono)]">python -m app.cli worker</code>{' '}
            and leave it running alongside the dev server.
          </Banner>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconDownload className="h-6 w-6" />} title="No exports yet"
            body="Queue one above and it will appear here when it is ready." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Export</TH>
              <TH>Status</TH>
              <TH align="right">Rows</TH>
              <TH align="right">Size</TH>
              <TH>Requested by</TH>
              <TH align="right">When</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {jobs.map((job) => (
              <TR key={job.id}>
                <TD><Badge tone={job.resource === 'full_report' ? 'positive' : 'neutral'}>{labels[job.resource] ?? job.resource}</Badge></TD>
                <TD>
                  <StatusBadge status={job.status} />
                  {job.error && (
                    <span className="block max-w-[220px] truncate text-[11.5px] text-[var(--color-critical)]">
                      {job.error}
                    </span>
                  )}
                </TD>
                <TD align="right">{job.row_count || '—'}</TD>
                <TD align="right" className="text-[var(--color-ink-soft)]">{fileSize(job.file_size)}</TD>
                <TD className="text-[var(--color-ink-soft)]">{job.requested_by ?? '—'}</TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {dateTime(job.completed_at ?? job.created_at)}
                </TD>
                <TD align="right">
                  {job.download_url && (
                    <a href={job.download_url}>
                      <Button size="sm">
                        <IconDownload className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </a>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  )
}
