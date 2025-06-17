/**
 * Custom hook for managing recording session logic
 */

import { useRef, useCallback } from 'react';
import * as recordingApi from '../services/recordingApi';
import type { UserAction } from '../types';

export const useRecordingSession = () => {
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Start action polling during recording
  const startActionPolling = useCallback((sessionId: string, updateActions: (actions: UserAction[]) => void) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await recordingApi.getSessionActions(sessionId);
        updateActions(response.actions);
      } catch (error) {
        console.error('Failed to poll actions:', error);
      }
    }, 1000);
  }, []);

  // Stop action polling
  const stopActionPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Start recording session
  const startRecording = useCallback(async (url: string) => {
    if (!url.trim()) {
      throw new Error('Please enter a URL');
    }

    const response = await recordingApi.startRecordingSession({ url });
    return response;
  }, []);

  // Stop recording session
  const stopRecording = useCallback(async (sessionId: string) => {
    stopActionPolling();
    await recordingApi.stopRecordingSession(sessionId);
  }, [stopActionPolling]);

  return {
    startActionPolling,
    stopActionPolling,
    startRecording,
    stopRecording
  };
};
