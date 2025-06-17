/**
 * API service for recording session management
 * Communicates with Express backend for accessibility testing
 */

import type { UserAction, AnalysisResult } from '../types';

const API_BASE = 'http://localhost:3001/api';

export interface StartSessionRequest {
  url: string;
  name: string;
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
  const response = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Failed to start session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get recorded actions for a session
 */
export async function getSessionActions(sessionId: string): Promise<SessionActionsResponse> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/actions`);

  if (!response.ok) {
    throw new Error(`Failed to get session actions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Stop recording session
 */
export async function stopRecordingSession(sessionId: string): Promise<StopSessionResponse> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/stop`, {
    method: 'POST'
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
    throw new Error(`Failed to get analysis status: ${response.statusText}`);
  }

  return response.json();
}
