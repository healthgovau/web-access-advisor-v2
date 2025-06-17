/**
 * API service for recording session management
 * Communicates with Express backend for accessibility testing
 */

import type { UserAction, AnalysisResult } from '../types';

const API_BASE = 'http://localhost:3002/api';

export interface StartSessionRequest {
  url: string;
}

export interface StartSessionResponse {
  sessionId: string;
  status: 'recording';
}

export interface SessionActionsResponse {
  sessionId: string;
  actions: UserAction[];
}

export interface StopSessionResponse {
  sessionId: string;
  actionCount: number;
  status: 'stopped';
}

export interface AnalyzeSessionResponse {
  analysisId: string;
  status: 'analyzing' | 'completed';
  result?: AnalysisResult;
}

/**
 * Start a new recording session
 */
export async function startRecordingSession(request: StartSessionRequest): Promise<StartSessionResponse> {
  try {
    console.log('Starting recording session for URL:', request.url);
    console.log('API endpoint:', `${API_BASE}/record/start`);
    
    const response = await fetch(`${API_BASE}/record/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: request.url })
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to start session: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Session started successfully:', result);
    return result;
  } catch (error) {
    console.error('Network error in startRecordingSession:', error);
    throw error;
  }
}

/**
 * Get recorded actions for a session
 */
export async function getSessionActions(sessionId: string): Promise<SessionActionsResponse> {
  const response = await fetch(`${API_BASE}/record/${sessionId}/actions`);

  if (!response.ok) {
    throw new Error(`Failed to get session actions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Stop recording session
 */
export async function stopRecordingSession(sessionId: string): Promise<StopSessionResponse> {
  const response = await fetch(`${API_BASE}/record/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });

  if (!response.ok) {
    throw new Error(`Failed to stop session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Start accessibility analysis on recorded session
 */
export async function analyzeSession(sessionId: string): Promise<AnalyzeSessionResponse> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/analyze`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Failed to start analysis: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Poll for analysis results
 */
export async function getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/analysis/${analysisId}`);

  if (!response.ok) {
    throw new Error(`Failed to get analysis result: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get analysis status and result if completed
 */
export async function getAnalysisStatus(analysisId: string): Promise<AnalyzeSessionResponse> {
  const response = await fetch(`${API_BASE}/analysis/${analysisId}/status`);

  if (!response.ok) {
    console.error(`Failed to get analysis status: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to get analysis status: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`Analysis status for ${analysisId}:`, result);
  return result;
}
