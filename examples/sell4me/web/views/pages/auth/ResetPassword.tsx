import { Head, Link, useForm } from '@inertiajs/react'
import { Button, Field, Input } from '@/views/ui/kit'
import { useShared } from '@/js/hooks'

export default function ResetPassword({ token, valid }: { token: string; valid: boolean }) {
  const { errors } = useShared()
  const form = useForm({ password: '' })

  if (!valid) {
    return (
      <>
        <Head title="Link expired" />
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">That link has expired</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">
          Reset links work once and last an hour. Request a new one and it will land in your inbox right away.
        </p>
        <Link href="/forgot-password" className="mt-6 block">
          <Button tone="primary" className="w-full">Request a new link</Button>
        </Link>
      </>
    )
  }

  return (
    <>
      <Head title="Choose a new password" />
      <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">Make it something you haven't used here before.</p>

      <form
        className="mt-6 space-y-3.5"
        onSubmit={(event) => {
          event.preventDefault()
          form.post(`/reset-password/${token}`)
        }}
      >
        <Field label="New password" hint="At least 10 characters." error={errors.password}>
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            autoFocus
            required
            minLength={10}
            value={form.data.password}
            invalid={Boolean(errors.password)}
            onChange={(event) => form.setData('password', event.target.value)}
          />
        </Field>

        <Button type="submit" tone="primary" className="w-full" loading={form.processing}>
          Reset password
        </Button>
      </form>
    </>
  )
}
