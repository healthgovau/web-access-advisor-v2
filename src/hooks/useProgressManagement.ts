/**
 * Custom hook for managing progress state and updates
 */

import { useCallback } from 'react';
import type { ProgressStage } from '../types';

export const useProgressManagement = (updateState: (updates: any) => void) => {
  // Update progress helper
  const updateProgress = useCallback((
    stage: ProgressStage,
    message: string,
    progress?: number,
    details?: string,
    error?: string
  ) => {
    updateState({
      progress: {
        stage,
        message,
        progress,
        details,
        error
      }
    });
  }, [updateState]);

  // Handle specific error types with appropriate progress updates
  const handleAnalysisError = useCallback((error: Error | string) => {
    const errorMessage = error instanceof Error ? error.message : error;
    
    if (errorMessage.includes('token') || errorMessage.includes('limit')) {
      updateProgress('error', 'AI processing limit reached', undefined, 'Try reducing the number of actions or try again later', errorMessage);
    } else if (errorMessage.includes('Gemini') || errorMessage.includes('API key') || errorMessage.includes('service not available')) {
      updateProgress('error', 'AI analysis unavailable', undefined, 'Gemini AI service is not configured. Analysis completed with basic accessibility scan only.', errorMessage);
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      updateProgress('error', 'Network connection error', undefined, 'Check your internet connection and try again', errorMessage);
    } else {
      updateProgress('error', 'Analysis failed', undefined, 'An unexpected error occurred', errorMessage);
    }
  }, [updateProgress]);

  return {
    updateProgress,
    handleAnalysisError
  };
};
