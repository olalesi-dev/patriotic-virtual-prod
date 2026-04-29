import type { DehydratedState } from '@tanstack/react-query';
import { HydrationBoundary } from '@tanstack/react-query';

export function QueryHydration({
    children,
    state
}: {
    children: React.ReactNode;
    state: DehydratedState;
}) {
    return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
