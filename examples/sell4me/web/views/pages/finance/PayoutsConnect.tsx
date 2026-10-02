/**
 * Connecting a bank account for Paystack payouts.
 *
 * Unlike Providers.tsx, nothing here is a secret key — a merchant has none to
 * give. What they submit is a bank account, which the server turns into a
 * Paystack subaccount and transfer recipient (see app/services/payouts.py).
 * The account number itself is never sent back to this page once connected;
 * only the last four digits are, which is all the confirmation banner needs.
 */

import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import {
  Banner, Button, Field, Input, Panel, PageHeader, Select,
} from '@/views/ui/kit'

type Bank = { name: string; code: string }

type Account = {
  status: string
  status_message: string | null
  bank_name: string | null
  account_name: string | null
  account_number_last4: string | null
  is_connected: boolean
}

type Props = { banks: Bank[]; account: Account | null }

export default function PayoutsConnect({ banks, account }: Props) {
  const [businessName, setBusinessName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedBank = banks.find((bank) => bank.code === bankCode)
  const canSubmit = bankCode && /^\d{8,10}$/.test(accountNumber)

  return (
    <>
      <Head title="Payouts" />
      <PageHeader
        title="Connect payouts"
        description="Customer payments settle to the platform first. Connect your bank account to be paid your share once an order is confirmed."
      />

      {account?.is_connected && (
        <div className="mb-4">
          <Banner tone="ok" title="Payouts connected">
            {account.account_name}, {account.bank_name} •••• {account.account_number_last4}
          </Banner>
        </div>
      )}

      <Panel>
        <div className="space-y-3.5">
          <Field label="Business or trading name" hint="Shown on Paystack's own records for this account.">
            <Input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Your store name"
            />
          </Field>

          <Field label="Bank">
            <Select value={bankCode} onChange={(event) => setBankCode(event.target.value)}>
              <option value="">Choose a bank…</option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>{bank.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Account number">
            <Input
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="0123456789"
              inputMode="numeric"
              autoComplete="off"
            />
          </Field>

          <div className="rounded-[var(--radius-sm)] bg-[var(--color-sunken)] px-3 py-2 text-[12px] text-[var(--color-ink-soft)]">
            Saving verifies the account with {selectedBank?.name ?? 'your bank'} and connects it —
            there is no separate confirmation step.
          </div>

          <div className="flex justify-end">
            <Button
              tone="primary"
              size="sm"
              loading={saving}
              disabled={!canSubmit}
              onClick={() => {
                setSaving(true)
                router.post(
                  '/payments/payouts/connect',
                  { business_name: businessName, bank_code: bankCode, bank_name: selectedBank?.name ?? '', account_number: accountNumber },
                  { preserveScroll: true, onFinish: () => setSaving(false) },
                )
              }}
            >
              {account?.is_connected ? 'Reconnect' : 'Connect'}
            </Button>
          </div>
        </div>
      </Panel>

      {account && !account.is_connected && account.status_message && (
        <div className="mt-4">
          <Banner tone="caution" title="Not connected">
            {account.status_message}
          </Banner>
        </div>
      )}
    </>
  )
}
