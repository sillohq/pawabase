import { Head, Link, router } from '@inertiajs/react'
import { date, dateTime, money, useCan } from '@/js/hooks'
import {
  Banner, Button, Empty, KeyValue, Mono, Panel, PanelHeader, PageHeader,
  Stat, StatRow, StatusBadge, TBody, TD, TH, THead, TR,
} from '@/views/ui/kit'
import type { Money } from '@/js/types'

type Props = {
  campaign: {
    id: number
    name: string
    kind: string
    description: string | null
    status: string
    segment: string | null
    discount_code: string | null
    starts_at: string | null
    ends_at: string | null
    budget: Money | null
    spend: Money
    revenue: Money
    roi: Money
    orders_count: number
    recipients_count: number
    recovered_count: number
    last_run_at: string | null
  }
  redemptions: {
    id: number
    order_id: number
    order_number: number | null
    customer: string | null
    amount: Money
    created_at: string | null
  }[]
  audience_size: number | null
}

/** What a campaign in each state may become. Mirrors the server's own table so
 *  the buttons offered are exactly the transitions that will be accepted. */
const NEXT: Record<string, { label: string; target: string; tone?: 'primary' | 'danger' }[]> = {
  draft: [{ label: 'Start now', target: 'active', tone: 'primary' }],
  scheduled: [{ label: 'Start now', target: 'active', tone: 'primary' }, { label: 'Back to draft', target: 'draft' }],
  active: [{ label: 'Pause', target: 'paused' }, { label: 'Complete', target: 'completed' }],
  paused: [{ label: 'Resume', target: 'active', tone: 'primary' }, { label: 'Complete', target: 'completed' }],
  completed: [{ label: 'Archive', target: 'archived' }],
  archived: [],
}

export default function CampaignShow({ campaign, redemptions, audience_size }: Props) {
  const can = useCan()
  const actions = NEXT[campaign.status] ?? []

  return (
    <>
      <Head title={campaign.name} />
      <PageHeader
        breadcrumb={[{ label: 'Campaigns', href: '/marketing/campaigns' }, { label: campaign.name }]}
        title={campaign.name}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={campaign.status} />
            <span className="capitalize text-[var(--color-ink-faint)]">
              {campaign.kind.replace(/_/g, ' ')}
            </span>
          </span>
        }
        actions={can('campaigns.manage') && actions.map((action) => (
          <Button key={action.target} tone={action.tone} size="sm"
            onClick={() => router.post(`/marketing/campaigns/${campaign.id}/status`,
              { status: action.target }, { preserveScroll: true })}>
            {action.label}
          </Button>
        ))}
      />

      <StatRow>
        <Stat label="Attributed revenue" value={money(campaign.revenue)} hint={`${campaign.orders_count} orders`} />
        <Stat label="Spend" value={money(campaign.spend)}
          hint={campaign.budget ? `of ${money(campaign.budget)} budget` : 'entered by you'} />
        <Stat label="Return" value={campaign.spend.minor > 0 ? money(campaign.roi) : '—'}
          tone={campaign.roi.minor >= 0 ? 'positive' : 'critical'}
          hint={campaign.spend.minor > 0 ? 'revenue less spend' : 'no spend recorded'} />
        <Stat label="Audience" value={audience_size ?? 'Everyone'}
          hint={campaign.segment ?? 'no segment'} />
      </StatRow>

      <div className="mt-4">
        <Banner tone="neutral" title="How this is attributed">
          An order counts toward this campaign if it used
          {campaign.discount_code
            ? <> the code <Mono>{campaign.discount_code}</Mono></>
            : ' the campaign directly'}
          {campaign.starts_at && ' within the campaign window'}. Nothing wider is claimed —
          last-touch attribution across sessions would need tracking this platform does not do.
        </Banner>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel padded={false}>
            <PanelHeader title="Redemptions" description="Orders that used this campaign's code" />
            {redemptions.length === 0 ? (
              <Empty title="No redemptions yet"
                body={campaign.discount_code
                  ? 'Nobody has used the code yet.'
                  : 'This campaign has no discount code, so there is nothing to redeem.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <THead>
                    <tr>
                      <TH>Order</TH>
                      <TH>Customer</TH>
                      <TH align="right">Saving</TH>
                      <TH align="right">When</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {redemptions.map((redemption) => (
                      <TR key={redemption.id} href={`/orders/${redemption.order_id}`}>
                        <TD>
                          <Link href={`/orders/${redemption.order_id}`}
                            className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                            #{redemption.order_number}
                          </Link>
                        </TD>
                        <TD className="text-[var(--color-ink-soft)]">{redemption.customer ?? 'Guest'}</TD>
                        <TD align="right">{money(redemption.amount)}</TD>
                        <TD align="right" className="text-[var(--color-ink-faint)]">
                          {date(redemption.created_at)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Details" />
            <div className="pt-2">
              <KeyValue rows={[
                { label: 'Type', value: <span className="capitalize">{campaign.kind.replace(/_/g, ' ')}</span> },
                { label: 'Discount', value: campaign.discount_code ? <Mono>{campaign.discount_code}</Mono> : '—' },
                { label: 'Segment', value: campaign.segment ?? 'Everyone' },
                { label: 'Starts', value: campaign.starts_at ? dateTime(campaign.starts_at) : '—' },
                { label: 'Ends', value: campaign.ends_at ? dateTime(campaign.ends_at) : '—' },
                { label: 'Results refreshed', value: dateTime(campaign.last_run_at) },
              ]} />
            </div>
          </Panel>

          {campaign.description && (
            <Panel>
              <PanelHeader title="Notes" />
              <p className="whitespace-pre-wrap pt-3 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
                {campaign.description}
              </p>
            </Panel>
          )}

          {campaign.kind === 'abandoned_cart' && (
            <Panel>
              <PanelHeader title="Recovery" />
              <div className="pt-2">
                <KeyValue rows={[{ label: 'Baskets recovered', value: campaign.recovered_count }]} />
                <Link href="/customers/abandoned"
                  className="mt-2 inline-block text-[12.5px] text-[var(--color-accent)] hover:underline">
                  See abandoned baskets
                </Link>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
