/**
 * API service for recording session management
 * Communicates with Express backend for accessibility testing
 */

import type { UserAction, AnalysisResult, LLMDebugLog } from '../types';

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
  status: 'analyzing' | 'completed' | 'failed';
  result?: AnalysisResult;
  phase?: 'replaying-actions' | 'capturing-snapshots' | 'running-accessibility-checks' | 'processing-with-ai' | 'generating-report' | 'completed';
  message?: string;
  currentStep?: number;
  totalSteps?: number;
  snapshotCount?: number;
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
  // Log LLM debug information when analysis is completed
  if (result.status === 'completed' && result.result?.debug?.llmLogs) {
    console.log('🔍 DEBUG: Found LLM logs in recording analysis:', result.result.debug.llmLogs.length);
    result.result.debug.llmLogs.forEach((log: LLMDebugLog, index: number) => {
      console.group(`🤖 LLM ${log.type.toUpperCase()} ANALYSIS LOG #${index + 1}`);
      console.log(`📊 Timestamp: ${log.timestamp}`);
      console.log(`📊 Prompt size: ${log.promptSize.toLocaleString()} characters`);
      console.log(`📊 HTML content size: ${log.htmlSize.toLocaleString()} characters`);
      console.log(`📊 Axe results count: ${log.axeResultsCount} violations`);
        // Create a new tab with the prompt content
      const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LLM Prompt #${index + 1} - ${log.timestamp}</title>
          <style>
            body { font-family: monospace; margin: 20px; line-height: 1.4; background: #f9f9f9; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #007acc; }
            .stats { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px; }
            .stat { background: #e9f4ff; padding: 8px 12px; border-radius: 4px; font-size: 14px; }
            .prompt-content { background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 15px; }
            pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.4; }
            .copy-btn { background: #007acc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-bottom: 15px; }
            .copy-btn:hover { background: #005a9e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🤖 LLM ${log.type.toUpperCase()} Analysis Prompt #${index + 1}</h2>
              <div class="stats">
                <div class="stat">📅 ${log.timestamp}</div>
                <div class="stat">📏 Prompt: ${log.promptSize.toLocaleString()} chars</div>
                <div class="stat">🌐 HTML: ${log.htmlSize.toLocaleString()} chars</div>
                <div class="stat">⚠️ Axe Issues: ${log.axeResultsCount}</div>
              </div>
            </div>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent).then(() => alert('Prompt copied to clipboard!'))">📋 Copy Prompt</button>
            <div class="prompt-content">
              <pre>${log.prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}</pre>
            </div>
          </div>
        </body>
        </html>
      `)}`;
      
      const promptWindow = window.open(dataUri, '_blank');
      if (promptWindow) {
        console.log(`📋 Prompt opened in new tab`);
        (window as any)[`llmPromptWindow${index + 1}`] = promptWindow;
      } else {
        console.warn('⚠️ Could not open new tab (popup blocked?). Prompt available via window.llmPrompt' + (index + 1));
      }
      
      // Add global helper function for easy access
      (window as any)[`llmPrompt${index + 1}`] = log.prompt;
      console.log(`🔧 Global helper available: window.llmPrompt${index + 1}`);
      console.log(`📋 To copy: copy(window.llmPrompt${index + 1})`);
      
      console.groupEnd();
    });
  }
  
  return result;
}
