import { Head, Link, useForm } from '@inertiajs/react'
import { Button, Field, Input } from '@/views/ui/kit'
import { useShared } from '@/js/hooks'

export default function Login() {
  const { errors } = useShared()
  const form = useForm({ email: '', password: '' })

  return (
    <>
      <Head title="Sign in" />
      <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Welcome back</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">Sign in to manage your store, orders and payouts.</p>

      <form
        className="mt-6 space-y-3.5"
        onSubmit={(event) => {
          event.preventDefault()
          form.post('/login')
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

        <Field
          label={
            <span className="flex items-center justify-between">
              Password
              <Link href="/forgot-password" className="text-[12.5px] font-medium text-brand hover:underline">
                Forgot password?
              </Link>
            </span>
          }
          error={errors.password}
        >
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={form.data.password}
            invalid={Boolean(errors.password)}
            onChange={(event) => form.setData('password', event.target.value)}
          />
        </Field>

        <Button type="submit" tone="primary" className="w-full" loading={form.processing}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-muted">
        No account yet?{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create one
        </Link>
      </p>
    </>
  )
}
