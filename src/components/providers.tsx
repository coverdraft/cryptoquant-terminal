'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60000,       // 60s stale time (increased from 5s)
            refetchInterval: 120000, // 2 min refetch (increased from 10s)
            retry: 1,               // Only retry once on failure
            retryDelay: 3000,       // Wait 3s before retry
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
