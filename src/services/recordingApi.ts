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
 * Trigger interactive re-login detour on the server. Returns { ok, elapsedMs, reason }
 */
export async function interactiveRelogin(request: { browserType?: string; browserName?: string; probeUrl?: string; timeoutMs?: number; successSelector?: string }): Promise<{ ok: boolean; elapsedMs?: number; reason?: string; provisionalId?: string }>{
  const response = await fetch(`${API_BASE}/storage/interactive-relogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Interactive relogin failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

/**
 * Start manual authentication detour - opens browser but doesn't auto-validate
 */
export async function startAuthDetour(request: { browserType?: string; browserName?: string; probeUrl?: string }): Promise<{ detourId: string; message: string }>{
  const response = await fetch(`${API_BASE}/storage/start-auth-detour`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Start auth detour failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

/**
 * Complete manual authentication detour - validates and closes browser
 */
export async function completeAuthDetour(detourId: string): Promise<{ ok: boolean; provisionalId?: string; reason?: string }>{
  const response = await fetch(`${API_BASE}/storage/complete-auth-detour/${detourId}`, {
    method: 'POST'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Complete auth detour failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

/**
 * Cancel manual authentication detour - closes browser without validation
 */
export async function cancelAuthDetour(detourId: string): Promise<{ ok: boolean }>{
  const response = await fetch(`${API_BASE}/storage/cancel-auth-detour/${detourId}`, {
    method: 'POST'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cancel auth detour failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

export async function profileProbe(request: { browserType?: string; browserName?: string }): Promise<{ status: string; message?: string }> {
  const resp = await fetch(`${API_BASE}/storage/profile-probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!resp.ok) throw new Error(`Profile probe failed: ${resp.statusText}`);
  return resp.json();
}

/**
 * Get storage state status for a session id (proxy to server endpoint)
 */
export async function getStorageStateStatus(sessionId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/storage-state/status`);
  if (!response.ok) throw new Error(`Failed to get storage state status: ${response.statusText}`);
  return response.json();
}

/**
 * Validate storage state for a session by probing the target URL
 */
export async function validateStorageState(sessionId: string, options: { probeUrl?: string; successSelector?: string; timeoutMs?: number } = {}): Promise<{ ok: boolean; reason?: string }> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/storage-state/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  
  if (!response.ok) throw new Error(`Failed to validate storage state: ${response.statusText}`);
  return response.json();
}

/**
 * Find sessions that might have valid storageState for a target URL
 */
export async function findSessionsWithStorageState(targetUrl: string): Promise<{ sessionId: string; url: string; lastModified: string }[]> {
  const response = await fetch(`${API_BASE}/storage/find-sessions?targetUrl=${encodeURIComponent(targetUrl)}`);
  if (!response.ok) throw new Error(`Failed to find sessions: ${response.statusText}`);
  return response.json();
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
 * Check current URL of active recording session
 */
export async function getSessionCurrentUrl(sessionId: string): Promise<{ currentUrl: string; targetUrl: string }> {
  const response = await fetch(`${API_BASE}/record/${sessionId}/current-url`);
  
  if (!response.ok) {
    throw new Error(`Failed to get current URL: ${response.statusText}`);
  }
  
  return response.json();
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
  browserName?: string;
  useProfile?: boolean;
}> {
  const response = await fetch(`${API_BASE}/recordings/${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to load session: ${response.statusText}`);
  }

  return response.json();
}
