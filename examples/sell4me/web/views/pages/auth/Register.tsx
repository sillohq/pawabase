import { Head, Link, useForm } from '@inertiajs/react'
import { useState, type ReactNode } from 'react'
import { Button, Field, Input } from '@/views/ui/kit'
import { useShared } from '@/js/hooks'
import {
  IconBag,
  IconChevronLeft,
  IconClock,
  IconDownload,
  IconFile,
  IconGlobe,
  IconMegaphone,
  IconMore,
  IconSearch,
  IconSearchAlt,
  IconUser,
} from '@/views/ui/icons'

type Icon = (props: { className?: string }) => ReactNode

const HEARD_FROM: { key: string; label: string; icon: Icon }[] = [
  { key: 'search', label: 'A search engine', icon: IconSearch },
  { key: 'social', label: 'Social media', icon: IconGlobe },
  { key: 'friend', label: 'A friend or colleague', icon: IconUser },
  { key: 'ad', label: 'An online ad', icon: IconMegaphone },
  { key: 'press', label: 'Press or a blog post', icon: IconFile },
  { key: 'other', label: 'Somewhere else', icon: IconMore },
]

const SIGNUP_GOALS: { key: string; label: string; icon: Icon }[] = [
  { key: 'physical', label: 'Physical products', icon: IconBag },
  { key: 'digital', label: 'Digital products', icon: IconDownload },
  { key: 'services', label: 'Services or bookings', icon: IconClock },
  { key: 'not_sure', label: "I'm still deciding", icon: IconSearchAlt },
]

function Chip({
  label, icon: Icon, active, onClick,
}: { label: string; icon: Icon; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-[13px] font-medium transition ${
        active ? 'border-brand bg-brand-soft text-brand' : 'border-transparent bg-sunken text-ink hover:bg-line-soft'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

export default function Register() {
  const { errors, app } = useShared()
  const [step, setStep] = useState<1 | 2>(1)
  const form = useForm({ name: '', email: '', password: '', heard_from: '', signup_goal: '' })

  function continueToSurvey(event: React.FormEvent) {
    event.preventDefault()
    setStep(2)
  }

  function submit() {
    form.post('/register')
  }

  if (step === 2) {
    return (
      <>
        <Head title="Create an account" />
        <button
          type="button"
          onClick={() => setStep(1)}
          className="mb-4 flex items-center gap-1 text-[12.5px] font-medium text-ink-muted hover:text-ink"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Step 2 of 2</p>
        <h1 className="mt-1.5 text-[22px] font-bold tracking-[-0.02em] text-ink">Just two quick questions</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">Helps us build the right things. Skip it if you'd rather not say.</p>

        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">Where did you hear about {app.name}?</p>
            <div className="grid grid-cols-2 gap-2">
              {HEARD_FROM.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  icon={option.icon}
                  active={form.data.heard_from === option.key}
                  onClick={() => form.setData('heard_from', form.data.heard_from === option.key ? '' : option.key)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">What are you looking to sell?</p>
            <div className="grid grid-cols-2 gap-2">
              {SIGNUP_GOALS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  icon={option.icon}
                  active={form.data.signup_goal === option.key}
                  onClick={() => form.setData('signup_goal', form.data.signup_goal === option.key ? '' : option.key)}
                />
              ))}
            </div>
          </div>
        </div>

        <Button tone="primary" className="mt-7 w-full" loading={form.processing} onClick={submit}>
          Create account
        </Button>
        <button
          type="button"
          onClick={submit}
          disabled={form.processing}
          className="mt-3 w-full text-center text-[12.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-50"
        >
          Skip and create account
        </button>
      </>
    )
  }

  return (
    <>
      <Head title="Create an account" />
      <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Create your account</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">Then set up your store. No monthly fee — $1 per successful sale.</p>

      <form className="mt-6 space-y-3.5" onSubmit={continueToSurvey}>
        <Field label="Your name" error={errors.name}>
          <Input
            name="name"
            autoComplete="name"
            autoFocus
            required
            value={form.data.name}
            invalid={Boolean(errors.name)}
            onChange={(event) => form.setData('name', event.target.value)}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={form.data.email}
            invalid={Boolean(errors.email)}
            onChange={(event) => form.setData('email', event.target.value)}
          />
        </Field>

        <Field label="Password" hint="At least 10 characters." error={errors.password}>
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={form.data.password}
            invalid={Boolean(errors.password)}
            onChange={(event) => form.setData('password', event.target.value)}
          />
        </Field>

        <Button type="submit" tone="primary" className="w-full">
          Continue
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
