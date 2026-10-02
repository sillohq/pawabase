import { Head, Link, useForm } from '@inertiajs/react'
import { Button, Field, Input } from '@/views/ui/kit'
import { useShared } from '@/js/hooks'

export default function ForgotPassword() {
  const { errors } = useShared()
  const form = useForm({ email: '' })

  return (
    <>
      <Head title="Reset your password" />
      <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Reset your password</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">
        Enter the email on your account and we'll send you a link to choose a new one.
      </p>

      <form
        className="mt-6 space-y-3.5"
        onSubmit={(event) => {
          event.preventDefault()
          form.post('/forgot-password')
        }}
      >
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            required
            value={form.data.email}
            invalid={Boolean(errors.email)}
            onChange={(event) => form.setData('email', event.target.value)}
          />
        </Field>

        <Button type="submit" tone="primary" className="w-full" loading={form.processing}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
