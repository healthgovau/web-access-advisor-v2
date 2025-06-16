/**
 * TanStack Query Provider setup for Web Access Advisor
 * Configures global query client with optimized settings
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

// Global query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for all queries
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // Disable for better UX
      refetchOnReconnect: true, // Refetch when connection restored
    },
    mutations: {
      // Global defaults for mutations
      retry: 1, // Retry mutations once on failure
      onError: (error) => {
        // Global error handling for mutations
        console.error('Mutation error:', error);
        // TODO: Add toast notification for errors
      },
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider component
 * Wraps the app with TanStack Query context
 */
export const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query devtools in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};

// Export query client for direct access if needed
export { queryClient };
