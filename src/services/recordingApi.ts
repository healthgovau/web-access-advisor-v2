/**
 * API service for recording session management
 * Communicates with Express backend for accessibility testing
 */

import type { UserAction, AnalysisResult, LLMDebugLog } from '../types';

const API_BASE = 'http://localhost:3002/api';

export interface StartSessionRequest {
  url: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  browserName?: string;
  useProfile?: boolean;
  name?: string;
}

export interface BrowserOption {
  type: 'chromium' | 'firefox' | 'webkit';
  name: string;
  available: boolean;
  profilePath?: string;
}

export interface GetBrowsersResponse {
  browsers: BrowserOption[];
  message: string;
}

export interface CheckDomainLoginResponse {
  domain: string;
  loginStatus: { [browserName: string]: boolean };
  message: string;
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
  status: 'analyzing' | 'completed' | 'failed';
  result?: AnalysisResult;
  phase?: 'replaying-actions' | 'capturing-snapshots' | 'running-accessibility-checks' | 'processing-with-ai' | 'generating-report' | 'completed';
  message?: string;
  currentStep?: number;
  totalSteps?: number;
  snapshotCount?: number;
  batchCurrent?: number;
  batchTotal?: number;
}

/**
 * Check domain login status across browsers
 */
export async function checkDomainLogin(url: string): Promise<CheckDomainLoginResponse> {
  try {
    const response = await fetch(`${API_BASE}/browsers/check-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check domain login: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error checking domain login:', error);
    throw error;
  }
}

/**
 * Get available browsers
 */
export async function getAvailableBrowsers(): Promise<GetBrowsersResponse> {
  try {
    const response = await fetch(`${API_BASE}/browsers`);
    
    if (!response.ok) {
      throw new Error(`Failed to get browsers: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting available browsers:', error);
    throw error;
  }
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
      body: JSON.stringify({ 
        url: request.url,
        browserType: request.browserType,
        browserName: request.browserName,
        useProfile: request.useProfile,
        name: request.name
      })
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
export async function analyzeSession(sessionId: string, options?: { staticSectionMode?: 'include' | 'ignore' | 'separate' }): Promise<AnalyzeSessionResponse> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options || {})
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
  
  return result;
}

/**
 * Load a saved recording session
 */
export async function loadSavedSession(sessionId: string): Promise<{
  sessionId: string;
  sessionName: string;
  url: string;
  actions: UserAction[];
  actionCount: number;
  browserType?: string;
  useProfile?: boolean;
}> {
  const response = await fetch(`${API_BASE}/recordings/${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to load session: ${response.statusText}`);
  }

  return response.json();
}
