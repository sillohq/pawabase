import { Head, Link, router } from '@inertiajs/react'
import { ago } from '@/js/hooks'
import { Badge, Button, Empty, PageHeader, Panel } from '@/views/ui/kit'
import { IconBell } from '@/views/ui/icons'
import type { Notification } from '@/js/types'

const LEVEL_TONE = {
  info: 'info', success: 'positive', warning: 'caution', critical: 'critical',
} as const

export default function Notifications({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((notification) => !notification.read_at)

  return (
    <>
      <Head title="Notifications" />
      <PageHeader
        title="Notifications"
        description="New orders, failed payments, low stock and anything else worth interrupting you for."
        actions={unread.length > 0 && (
          <Button size="sm" onClick={() => router.post('/notifications/read', {}, { preserveScroll: true })}>
            Mark all read
          </Button>
        )}
      />

      {notifications.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconBell className="h-6 w-6" />} title="Nothing to report"
            body="You will hear from us when an order arrives, a payment fails, or stock runs low." />
        </div>
      ) : (
        <Panel padded={false}>
          <div className="divide-y divide-[var(--color-line-soft)]">
            {notifications.map((notification) => {
              const body = (
                <>
                  <span className={'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ' +
                    (notification.read_at ? 'bg-transparent' : 'bg-[var(--color-accent)]')} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={'text-[13px] ' +
                        (notification.read_at
                          ? 'text-[var(--color-ink-soft)]'
                          : 'font-medium text-[var(--color-ink)]')}>
                        {notification.title}
                      </span>
                      <Badge tone={LEVEL_TONE[notification.level] ?? 'neutral'}>
                        {notification.kind.replace(/\./g, ' ')}
                      </Badge>
                    </span>
                    {notification.body && (
                      <span className="mt-0.5 block text-[12.5px] text-[var(--color-ink-soft)]">
                        {notification.body}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[11.5px] text-[var(--color-ink-faint)]">
                      {ago(notification.created_at)}
                    </span>
                  </span>
                </>
              )

              return notification.url ? (
                <Link key={notification.id} href={notification.url}
                  className="row-hover flex gap-2.5 px-4 py-3 transition-colors">
                  {body}
                </Link>
              ) : (
                <div key={notification.id} className="flex gap-2.5 px-4 py-3">{body}</div>
              )
            })}
          </div>
        </Panel>
      )}
    </>
  )
}
