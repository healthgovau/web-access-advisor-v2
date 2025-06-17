/**
 * Custom hook for managing accessibility analysis logic
 */

import { useCallback } from 'react';
import * as recordingApi from '../services/recordingApi';
import type { AnalysisResult } from '../types';

export const useAccessibilityAnalysis = () => {
  // Start analysis
  const startAnalysis = useCallback(async (sessionId: string, actionCount: number) => {
    if (actionCount === 0) {
      throw new Error('No actions to analyze');
    }

    console.log(`Starting analysis of ${actionCount} actions`);
    const response = await recordingApi.analyzeSession(sessionId);
    return response;
  }, []);

  // Poll for analysis status
  const pollAnalysisStatus = useCallback(async (analysisId: string) => {
    return await recordingApi.getAnalysisStatus(analysisId);
  }, []);

  // Handle analysis completion
  const handleAnalysisResult = useCallback((result: AnalysisResult) => {
    if (result.warnings && result.warnings.length > 0) {
      const warningMessage = result.warnings[0];
      if (warningMessage.includes('Gemini') || warningMessage.includes('AI analysis unavailable')) {
        return {
          stage: 'completed' as const,
          message: 'Analysis complete',
          details: 'AI analysis unavailable - Gemini API not configured'
        };
      } else {
        return {
          stage: 'completed' as const,
          message: 'Analysis complete',
          details: `Warning: ${warningMessage}`
        };
      }
    } else {
      return {
        stage: 'completed' as const,
        message: 'Analysis complete',
        details: 'Report generated successfully'
      };
    }
  }, []);

  return {
    startAnalysis,
    pollAnalysisStatus,
    handleAnalysisResult
  };
};
