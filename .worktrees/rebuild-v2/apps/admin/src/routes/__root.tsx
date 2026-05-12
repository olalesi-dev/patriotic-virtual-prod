/// <reference types="vite/client" />

import { type QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { ToastProvider } from '@workspace/ui/toast-provider';
import { ThemeProvider, themeInitScript } from '@workspace/ui/theme-provider';
import { TooltipProvider } from '@workspace/ui/tooltip';
import { type ReactNode } from 'react';
import appCss from '../styles/app.css?url';

export interface RouterContext {
  queryClient: QueryClient;
}

const RootComponent = () => (
  <RootDocument>
    <ThemeProvider defaultThemeScope="admin">
      <TooltipProvider>
        <Outlet />
        <ToastProvider />
      </TooltipProvider>
    </ThemeProvider>
  </RootDocument>
);

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <HeadContent />
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
);

const RootError = () => (
  <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
    <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Admin workspace failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Refresh the page. If this repeats, check the dev console and API
        connectivity.
      </p>
    </div>
  </div>
);

const NotFound = () => (
  <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
    <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The admin page you requested is not part of this workspace yet.
      </p>
    </div>
  </div>
);

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Patriotic Admin' },
      {
        name: 'description',
        content: 'Administrative workspace for Patriotic Virtual Telehealth.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});
