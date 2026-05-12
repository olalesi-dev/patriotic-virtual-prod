import { Link } from '@tanstack/react-router';
import {
  IconBell,
  IconChevronDown,
  IconCircleCheck,
  IconMenu2,
  IconSearch,
} from '@tabler/icons-react';
import { Button } from '@workspace/ui/button';
import { IconTooltip } from '@workspace/ui/tooltip';
import { type ReactNode } from 'react';
import { adminRoutes } from '~/lib/route-metadata';
import { cn } from '~/lib/utils';
import { ThemeToggle } from './theme-toggle';

interface AdminShellProps {
  children: ReactNode;
}

export const AdminShell = ({ children }: AdminShellProps) => (
  <div className="min-h-dvh bg-background text-foreground">
    <div className="grid min-h-dvh lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-5">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              PV
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                Patriotic Admin
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Provider system
              </span>
            </span>
          </Link>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {adminRoutes.map((route) => {
            const Icon = route.icon;

            return (
              <Link
                key={route.id}
                to={route.path}
                className={cn(
                  'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                )}
                activeProps={{
                  className: 'bg-accent text-accent-foreground',
                }}
              >
                <Icon aria-hidden="true" size={18} stroke={1.8} />
                <span>{route.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <IconTooltip label="Open navigation">
            <Button
              aria-label="Open navigation"
              className="lg:hidden"
              size="icon"
              type="button"
              variant="ghost"
            >
              <IconMenu2 aria-hidden="true" size={20} stroke={1.8} />
            </Button>
          </IconTooltip>

          <label className="relative hidden w-full max-w-md md:block">
            <span className="sr-only">Search admin workspace</span>
            <IconSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={17}
              stroke={1.8}
            />
            <input
              className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="Search patients, providers, appointments"
              type="search"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground md:flex">
              <IconCircleCheck
                aria-hidden="true"
                className="text-primary"
                size={15}
                stroke={2}
              />
              Live systems
            </span>
            <IconTooltip label="Notifications">
              <Button
                aria-label="Notifications"
                size="icon"
                type="button"
                variant="ghost"
              >
                <IconBell aria-hidden="true" size={18} stroke={1.8} />
              </Button>
            </IconTooltip>
            <ThemeToggle />
            <button
              className="flex h-9 items-center gap-2 rounded-md border bg-card px-2 text-sm font-medium transition-colors hover:bg-muted"
              type="button"
            >
              <span className="hidden md:inline">Admin</span>
              <IconChevronDown aria-hidden="true" size={16} stroke={1.8} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  </div>
);
