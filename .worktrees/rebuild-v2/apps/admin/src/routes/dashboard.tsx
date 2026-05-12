import { createFileRoute } from '@tanstack/react-router';
import {
  IconAlertCircle,
  IconCalendarCheck,
  IconMailCheck,
  IconMessage2Check,
  IconShieldCheck,
  IconStethoscope,
  IconUsers,
} from '@tabler/icons-react';
import { Button } from '@workspace/ui/button';
import { AdminShell } from '~/components/shell/admin-shell';

const metrics = [
  {
    label: 'Provider reviews',
    value: '18',
    trend: '+4 today',
    icon: IconStethoscope,
    tone: 'text-primary bg-accent',
  },
  {
    label: 'Open scheduling issues',
    value: '7',
    trend: '2 urgent',
    icon: IconCalendarCheck,
    tone: 'text-secondary-foreground bg-secondary',
  },
  {
    label: 'Auth exceptions',
    value: '3',
    trend: 'needs review',
    icon: IconShieldCheck,
    tone: 'text-destructive bg-destructive/10',
  },
  {
    label: 'Support queue',
    value: '24',
    trend: 'stable',
    icon: IconUsers,
    tone: 'text-muted-foreground bg-muted',
  },
];

const queueItems = [
  ['Provider credential update', 'Clinical ops', 'High'],
  ['Failed patient welcome email', 'Notifications', 'Medium'],
  ['DoseSpot task queue mismatch', 'Clinical integrations', 'High'],
  ['Break-glass grant review', 'Compliance', 'Medium'],
];

const communicationRows = [
  ['Booking confirmations', 'Email', '99.4%', 'Healthy'],
  ['Reschedule notices', 'Email + SMS', '98.7%', 'Healthy'],
  ['Cancellation notices', 'Email + SMS', '99.1%', 'Healthy'],
  ['Auth OTP delivery', 'Email + SMS', '97.9%', 'Watch'],
];

const DashboardPage = () => (
  <AdminShell>
    <div className="space-y-5">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review operational queues, scheduling health, and security signals
            from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary">
            Export snapshot
          </Button>
          <Button type="button">Review queue</Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                </div>
                <span className={`rounded-md p-2 ${metric.tone}`}>
                  <Icon aria-hidden="true" size={19} stroke={1.8} />
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {metric.trend}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">
                Today&apos;s admin queue
              </h2>
              <p className="text-xs text-muted-foreground">
                Prioritized items for manual review.
              </p>
            </div>
            <IconAlertCircle
              aria-hidden="true"
              className="text-destructive"
              size={18}
              stroke={1.8}
            />
          </div>
          <div className="divide-y">
            {queueItems.map(([title, area, priority]) => (
              <div
                key={title}
                className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_180px_96px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{area}</p>
                </div>
                <span className="text-sm text-muted-foreground">{area}</span>
                <span className="w-fit rounded-md bg-muted px-2 py-1 text-xs font-medium">
                  {priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Security posture</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Strict auth flags are staged for UI readiness.
              </p>
            </div>
            <IconShieldCheck
              aria-hidden="true"
              className="text-primary"
              size={20}
              stroke={1.8}
            />
          </div>
          <div className="mt-4 space-y-3">
            {[
              'MFA factors available',
              'Server idle timeout active',
              'Step-up routes staged',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="text-sm">{item}</span>
                <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Communication health</h2>
            <p className="text-xs text-muted-foreground">
              Email and SMS delivery overview for core events.
            </p>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <IconMailCheck aria-hidden="true" size={18} stroke={1.8} />
            <IconMessage2Check aria-hidden="true" size={18} stroke={1.8} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-muted/70 text-left text-xs uppercase tracking-normal text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Workflow</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Success rate</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {communicationRows.map(([workflow, channel, rate, status]) => (
                <tr key={workflow}>
                  <td className="px-4 py-3 font-medium">{workflow}</td>
                  <td className="px-4 py-3 text-muted-foreground">{channel}</td>
                  <td className="px-4 py-3">{rate}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </AdminShell>
);

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [{ title: 'Dashboard | Patriotic Admin' }],
  }),
  component: DashboardPage,
});
