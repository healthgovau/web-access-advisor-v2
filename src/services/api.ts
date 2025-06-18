/**
 * HTTP API client for Web Access Advisor
 * Uses native fetch with TanStack Query for state management
 */

import type { 
  UserAction, 
  AnalysisResult, 
  AnalysisOptions,
  SessionManifest,
  SnapshotData,
  LLMDebugLog 
} from '../types';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * HTTP client wrapper with error handling
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Singleton API client instance
export const apiClient = new ApiClient();

// API endpoint functions for TanStack Query

/**
 * Start accessibility analysis
 */
export const startAnalysis = async (
  actions: UserAction[], 
  options?: AnalysisOptions
): Promise<AnalysisResult> => {
  const result = await apiClient.post<AnalysisResult>('/api/analyze', {
    actions,
    options: options || {}  });

  // Log LLM debug information to browser console
  console.log('🔍 DEBUG: Checking for LLM debug logs...', result.debug);
  if (result.debug?.llmLogs) {
    console.log('🔍 DEBUG: Found LLM logs:', result.debug.llmLogs.length);
    result.debug.llmLogs.forEach((log: LLMDebugLog, index: number) => {
      console.group(`🤖 LLM ${log.type.toUpperCase()} ANALYSIS LOG #${index + 1}`);
      console.log(`📊 Timestamp: ${log.timestamp}`);
      console.log(`📊 Prompt size: ${log.promptSize.toLocaleString()} characters`);
      console.log(`📊 HTML content size: ${log.htmlSize.toLocaleString()} characters`);
      console.log(`📊 Axe results count: ${log.axeResultsCount} violations`);
      
      // Log prompt in chunks to avoid truncation
      console.group('🔍 FULL PROMPT SENT TO GEMINI:');
      console.log('📋 Click to copy full prompt to clipboard:', log.prompt);
      
      // Break prompt into viewable chunks
      const promptChunks = log.prompt.match(/.{1,8000}/g) || [log.prompt];
      promptChunks.forEach((chunk, chunkIndex) => {
        console.log(`📄 Prompt part ${chunkIndex + 1}/${promptChunks.length}:`, chunk);
      });
      console.groupEnd();
        // Provide easy access to full prompt content
      console.log('💾 Full prompt object (expand to see all):', {
        prompt: log.prompt,
        stats: {
          promptSize: log.promptSize,
          htmlSize: log.htmlSize,
          axeResultsCount: log.axeResultsCount
        }
      });
      
      // Add global helper function for easy access to prompt
      (window as any)[`llmPrompt${index + 1}`] = log.prompt;
      console.log(`🔧 Global helper available:`);
      console.log(`   - window.llmPrompt${index + 1} (access full prompt)`);
      console.log(`   - copy(window.llmPrompt${index + 1}) (copy prompt to clipboard)`);
      
      console.groupEnd();
    });
  }

  return result;
};

/**
 * Get analysis session by ID
 */
export const getSession = async (sessionId: string): Promise<SessionManifest> => {
  return apiClient.get<SessionManifest>(`/api/sessions/${sessionId}`);
};

/**
 * Get all analysis sessions
 */
export const getSessions = async (): Promise<SessionManifest[]> => {
  return apiClient.get<SessionManifest[]>('/api/sessions');
};

/**
 * Get specific snapshot data
 */
export const getSnapshot = async (
  sessionId: string, 
  step: number
): Promise<SnapshotData> => {
  return apiClient.get<SnapshotData>(`/api/sessions/${sessionId}/snapshots/${step}`);
};

/**
 * Get analysis progress (for real-time updates)
 */
export const getAnalysisProgress = async (sessionId: string): Promise<{
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  message?: string;
}> => {
  return apiClient.get(`/api/sessions/${sessionId}/progress`);
};

/**
 * Start recording user actions
 */
export const startRecording = async (url: string): Promise<{
  sessionId: string;
  status: string;
}> => {
  return apiClient.post('/api/record/start', { url });
};

/**
 * Stop recording and get actions
 */
export const stopRecording = async (sessionId: string): Promise<{
  actions: UserAction[];
  sessionId: string;
}> => {
  return apiClient.post(`/api/record/stop`, { sessionId });
};

/**
 * Health check endpoint
 */
export const healthCheck = async (): Promise<{
  status: string;
  timestamp: string;
  version: string;
}> => {
  return apiClient.get('/api/health');
};

/**
 * Delete a session
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  return apiClient.delete(`/api/sessions/${sessionId}`);
};

export default apiClient;
