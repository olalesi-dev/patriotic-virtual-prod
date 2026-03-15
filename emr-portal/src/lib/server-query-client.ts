import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

function makeServerQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000,
                gcTime: 5 * 60 * 1000,
                retry: 1,
                refetchOnWindowFocus: false
            },
            mutations: {
                retry: 0
            }
        }
    });
}

export const getServerQueryClient = cache(makeServerQueryClient);
