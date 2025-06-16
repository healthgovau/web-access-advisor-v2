/**
 * TanStack Query hooks for Web Access Advisor
 * Provides caching, loading states, and real-time updates
 */

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions 
} from '@tanstack/react-query';
import type { 
  UserAction, 
  AnalysisResult, 
  AnalysisOptions,
  SessionManifest
} from '../types';
import {
  startAnalysis,
  getSession,
  getSessions,
  getSnapshot,
  getAnalysisProgress,
  startRecording,
  stopRecording,
  healthCheck,
  deleteSession
} from './api.js';

// Query keys for consistent caching
export const queryKeys = {
  health: ['health'] as const,
  sessions: ['sessions'] as const,
  session: (id: string) => ['sessions', id] as const,
  snapshot: (sessionId: string, step: number) => ['snapshots', sessionId, step] as const,
  progress: (sessionId: string) => ['progress', sessionId] as const,
} as const;

/**
 * Health check query - checks API server status
 */
export const useHealthCheck = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: healthCheck,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
  });
};

/**
 * Get all analysis sessions
 */
export const useSessions = () => {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: getSessions,
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Get specific session details
 */
export const useSession = (
  sessionId: string,
  options?: Omit<UseQueryOptions<SessionManifest>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
    staleTime: Infinity, // Sessions don't change once completed
    ...options,
  });
};

/**
 * Get snapshot data for a specific step
 */
export const useSnapshot = (
  sessionId: string,
  step: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.snapshot(sessionId, step),
    queryFn: () => getSnapshot(sessionId, step),
    enabled: enabled && !!sessionId && step > 0,
    staleTime: Infinity, // Snapshots never change
  });
};

/**
 * Real-time analysis progress tracking
 */
export const useAnalysisProgress = (
  sessionId: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.progress(sessionId),
    queryFn: () => getAnalysisProgress(sessionId),
    enabled: enabled && !!sessionId,    refetchInterval: (query) => {
      // Stop polling when analysis is complete or error
      const data = query.state.data;
      if (data && (data.status === 'completed' || data.status === 'error')) {
        return false;
      }
      return 1000; // Poll every second during analysis
    },
    staleTime: 0, // Always fresh for real-time updates
  });
};

/**
 * Start accessibility analysis mutation
 */
export const useStartAnalysis = (
  options?: UseMutationOptions<AnalysisResult, Error, {
    actions: UserAction[];
    analysisOptions?: AnalysisOptions;
  }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ actions, analysisOptions }) => 
      startAnalysis(actions, analysisOptions),
    onSuccess: (data) => {
      // Invalidate sessions list to show new session
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      
      // Cache the new session data
      queryClient.setQueryData(queryKeys.session(data.sessionId), data.manifest);
    },
    ...options,
  });
};

/**
 * Start recording user actions mutation
 */
export const useStartRecording = (
  options?: UseMutationOptions<{ sessionId: string; status: string }, Error, string>
) => {
  return useMutation({
    mutationFn: startRecording,
    ...options,
  });
};

/**
 * Stop recording mutation
 */
export const useStopRecording = (
  options?: UseMutationOptions<{ actions: UserAction[]; sessionId: string }, Error, string>
) => {
  return useMutation({
    mutationFn: stopRecording,
    ...options,
  });
};

/**
 * Delete session mutation
 */
export const useDeleteSession = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, sessionId) => {
      // Remove session from cache
      queryClient.removeQueries({ queryKey: queryKeys.session(sessionId) });
      
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      
      // Remove any related snapshots
      queryClient.removeQueries({ 
        queryKey: ['snapshots', sessionId],
        exact: false 
      });
      
      // Remove progress tracking
      queryClient.removeQueries({ queryKey: queryKeys.progress(sessionId) });
    },
    ...options,
  });
};

/**
 * Prefetch session data (useful for hover states)
 */
export const usePrefetchSession = () => {
  const queryClient = useQueryClient();

  return (sessionId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.session(sessionId),
      queryFn: () => getSession(sessionId),
      staleTime: Infinity,
    });
  };
};

/**
 * Custom hook for managing analysis workflow
 */
export const useAnalysisWorkflow = () => {
  const startAnalysisMutation = useStartAnalysis();
  const startRecordingMutation = useStartRecording();
  const stopRecordingMutation = useStopRecording();

  const startFullWorkflow = async (url: string, _analysisOptions?: AnalysisOptions) => {
    try {
      // Start recording
      const recordingResult = await startRecordingMutation.mutateAsync(url);
      
      // TODO: In real implementation, user would interact with the page
      // For now, we'll need to integrate with the recording UI
      
      return recordingResult;
    } catch (error) {
      throw error;
    }
  };

  const completeWorkflow = async (
    sessionId: string, 
    analysisOptions?: AnalysisOptions
  ) => {
    try {
      // Stop recording and get actions
      const { actions } = await stopRecordingMutation.mutateAsync(sessionId);
      
      // Start analysis with recorded actions
      const analysisResult = await startAnalysisMutation.mutateAsync({
        actions,
        analysisOptions
      });
      
      return analysisResult;
    } catch (error) {
      throw error;
    }
  };

  return {
    startFullWorkflow,
    completeWorkflow,
    isRecording: startRecordingMutation.isPending || stopRecordingMutation.isPending,
    isAnalyzing: startAnalysisMutation.isPending,
    error: startAnalysisMutation.error || startRecordingMutation.error || stopRecordingMutation.error,
  };
};
