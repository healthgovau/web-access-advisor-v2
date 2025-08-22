/**
 * Web Access Advisor HTTP API Server
 * Express server that bridges React frontend to core analysis engine
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import validator from 'validator';

// Load environment variables from server directory (better for deployment)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure we always load from the actual server directory, not dist/server
const serverDir = __dirname.includes('dist') ? join(__dirname, '../..') : __dirname;
const envPath = join(serverDir, '.env');
const envLocalPath = join(serverDir, '.env.local');

console.log(`📁 __dirname: ${__dirname}`);
console.log(`📁 serverDir: ${serverDir}`);
console.log(`📄 envPath: ${envPath}`);
console.log(`📄 envLocalPath: ${envLocalPath}`);

// Check if files exist
console.log(`📄 .env exists: ${existsSync(envPath)}`);
console.log(`📄 .env.local exists: ${existsSync(envLocalPath)}`);

console.log(`📄 Loading defaults from: .env`);
const envResult = config({ path: envPath });
console.log(`📄 .env result:`, envResult.error ? `Error: ${envResult.error}` : 'Success');

console.log(`📄 Loading overrides from: .env.local`);
const envLocalResult = config({ path: envLocalPath, override: true });
console.log(`📄 .env.local result:`, envLocalResult.error ? `Error: ${envLocalResult.error}` : 'Success');

console.log(`🔑 Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes (' + process.env.GEMINI_API_KEY.substring(0, 10) + '...)' : 'No'}`);
console.log(`🌐 API Port: ${process.env.API_PORT || 3002}`);

// Timeout configurations
const BASE_ANALYSIS_TIMEOUT = parseInt(process.env.ANALYSIS_TIMEOUT || '1800000'); // 30 minutes default
const LLM_COMPONENT_TIMEOUT = parseInt(process.env.LLM_COMPONENT_TIMEOUT || '300000'); // 5 minutes default
const LLM_FLOW_TIMEOUT = parseInt(process.env.LLM_FLOW_TIMEOUT || '600000'); // 10 minutes default
const RECORDING_TIMEOUT = parseInt(process.env.RECORDING_TIMEOUT || '30000'); // 30 seconds default

/**
 * Calculate dynamic analysis timeout based on action count
 * Formula: Base timeout (10 minutes) + (action count * 20 seconds)
 * Minimum: 10 minutes, Maximum: 60 minutes
 */
function calculateAnalysisTimeout(actionCount: number): number {
  const baseTimeout = Math.max(600000, BASE_ANALYSIS_TIMEOUT); // Minimum 10 minutes
  const perActionTimeout = 20000; // 20 seconds per action
  const calculatedTimeout = baseTimeout + (actionCount * perActionTimeout);
  const maxTimeout = 3600000; // Maximum 60 minutes
  
  return Math.min(calculatedTimeout, maxTimeout);
}

console.log(`⏱️ Base analysis timeout: ${BASE_ANALYSIS_TIMEOUT / 1000}s (${Math.round(BASE_ANALYSIS_TIMEOUT / 60000)} minutes)`);
console.log(`⏱️ LLM component timeout: ${LLM_COMPONENT_TIMEOUT / 1000}s (${Math.round(LLM_COMPONENT_TIMEOUT / 60000)} minutes)`);
console.log(`⏱️ LLM flow timeout: ${LLM_FLOW_TIMEOUT / 1000}s (${Math.round(LLM_FLOW_TIMEOUT / 60000)} minutes)`);
console.log(`⏱️ Recording timeout: ${RECORDING_TIMEOUT / 1000}s`);

import { AccessibilityAnalyzer, SessionManifest, StaticSectionMode } from '@web-access-advisor/core';
import { browserRecordingService } from './recordingService.js';
import type { 
  UserAction, 
  AnalysisOptions, 
  AnalysisResult
} from '@web-access-advisor/core';

const app = express();
const PORT = process.env.API_PORT || 3002;

// Analysis phase tracking
interface AnalysisState {
  sessionId: string;
  status: 'analyzing' | 'completed' | 'failed';
  phase: 'replaying-actions' | 'capturing-snapshots' | 'running-accessibility-checks' | 'processing-with-ai' | 'generating-report' | 'completed';
  message: string;
  result?: AnalysisResult;
  manifest?: SessionManifest;
  startTime: Date;
  currentStep?: number;
  totalSteps?: number;
  snapshotCount?: number; // Track snapshots captured so far
  batchCurrent?: number;  // Current batch being processed
  batchTotal?: number;    // Total number of batches
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global analyzer instance
let analyzer: AccessibilityAnalyzer | null = null;

// In-memory storage for analysis sessions (replace with database in production)
const sessions = new Map<string, SessionManifest>();
const analysisStates = new Map<string, AnalysisState>();

/**
 * Initialize analyzer
 */
async function initializeAnalyzer(browserType?: 'chromium' | 'firefox' | 'webkit', useProfile?: boolean, browserName?: string) {
  // Always reinitialize analyzer with correct browser parameters for profile consistency
  if (analyzer) {
    // Clean up existing analyzer if it exists
    try {
      await analyzer.cleanup();
    } catch (error) {
      console.warn('Warning during analyzer cleanup:', error);
    }
  }
  
  analyzer = new AccessibilityAnalyzer();
  const geminiApiKey = process.env.GEMINI_API_KEY;
  console.log(`🔍 Environment check: GEMINI_API_KEY = ${geminiApiKey ? '[SET]' : '[NOT SET]'}`);
  console.log(`🔍 Analyzer init with: browserType=${browserType}, useProfile=${useProfile}, browserName=${browserName}`);
  
  await analyzer.initialize(geminiApiKey, browserType, useProfile, browserName);
  console.log('✓ Accessibility analyzer initialized with browser profile settings');
  if (geminiApiKey) {
    console.log('✓ Gemini AI service enabled');
  } else {
    console.log('⚠️ Gemini AI service disabled - no API key provided');
  }
  
  return analyzer;
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req: any, res: any) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VITE_APP_VERSION || '2.0.0',
    analyzer: analyzer ? 'initialized' : 'not_initialized'
  });
});

/**
 * Start accessibility analysis
 */
app.post('/api/analyze', async (req: any, res: any) => {
  try {
    const { actions, options }: { 
      actions: UserAction[], 
      options?: AnalysisOptions 
    } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({
        error: 'Invalid request: actions array required'
      });
    }

    // Initialize analyzer with browser profile parameters from options
    const currentAnalyzer = await initializeAnalyzer(
      options?.browserType,
      options?.useProfile,
      options?.browserName
    );
    
    console.log(`Starting analysis with ${actions.length} actions`);
    const result: AnalysisResult = await currentAnalyzer.analyzeActions(actions, options);
    
    // Store session in memory
    if (result.success && result.manifest) {
      sessions.set(result.sessionId, result.manifest);
    }

    res.json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all analysis sessions
 */
app.get('/api/sessions', (req: any, res: any) => {
  try {
    const sessionList = Array.from(sessions.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json(sessionList);
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get specific session details
 */
app.get('/api/sessions/:id', (req: any, res: any) => {
  try {
    const { id } = req.params;
    const session = sessions.get(id);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: id
      });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Session details error:', error);
    res.status(500).json({
      error: 'Failed to retrieve session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get snapshot data for specific step
 */
app.get('/api/sessions/:id/snapshots/:step', (req: any, res: any) => {
  try {
    const { id, step } = req.params;
    const session = sessions.get(id);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: id
      });
    }
    
    const stepNumber = parseInt(step, 10);
    const stepDetail = session.stepDetails.find(s => s.step === stepNumber);
    
    if (!stepDetail) {
      return res.status(404).json({
        error: 'Step not found',
        sessionId: id,
        step: stepNumber
      });
    }
    
    // TODO: Read actual snapshot files from disk
    res.json({
      step: stepDetail.step,
      action: stepDetail.action,
      timestamp: stepDetail.timestamp,
      html: '<!-- Snapshot HTML content -->', // TODO: Read from file
      axeContext: {}, // TODO: Read from file
      files: {
        html: stepDetail.htmlFile,
        axeContext: stepDetail.axeFile,
        screenshot: stepDetail.screenshotFile
      }
    });
    
  } catch (error) {
    console.error('Snapshot error:', error);
    res.status(500).json({
      error: 'Failed to retrieve snapshot',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get analysis progress (for real-time updates)
 */
app.get('/api/sessions/:id/progress', (req: any, res: any) => {
  try {
    const { id } = req.params;
    const session = sessions.get(id);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: id
      });
    }
    
    // For completed sessions, return completed status
    res.json({
      status: 'completed' as const,
      currentStep: session.totalSteps,
      totalSteps: session.totalSteps,
      message: 'Analysis complete'
    });
    
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({
      error: 'Failed to retrieve progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check domain login status across browsers
 */
app.post('/api/browsers/check-domain', async (req: any, res: any) => {
  try {
    console.log('🔍 DEBUG: Raw request body:', JSON.stringify(req.body, null, 2));
    const { url }: { url: string } = req.body;
    console.log('🔍 DEBUG: Extracted URL:', JSON.stringify(url));
    console.log('🔍 DEBUG: URL type:', typeof url);
    console.log('🔍 DEBUG: URL length:', url ? url.length : 'undefined');
    
    if (!url) {
      // Return "no login detected" for missing URL instead of error
      console.log(`❌ No URL provided`);
      return res.json({
        domain: null,
        loginStatus: {
          "Microsoft Edge": false,
          "Google Chrome": false,
          "Mozilla Firefox": false
        },
        message: 'No login detected - URL required'
      });
    }

    // Extract domain using proper validation
    let domain: string | null = null;
    
    // First try to parse as URL to extract hostname
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname && validator.isFQDN(urlObj.hostname)) {
        domain = urlObj.hostname;
      }
    } catch {
      // If URL parsing fails, check if the raw input is a valid domain
      if (validator.isFQDN(url)) {
        domain = url;
      }
    }

    // If no valid domain found, return no login detected
    if (!domain) {
      console.log(`❌ No valid domain found in: "${url}"`);
      return res.json({
        domain: null,
        loginStatus: {
          "Microsoft Edge": false,
          "Google Chrome": false,
          "Mozilla Firefox": false
        },
        message: 'No login detected - Invalid domain'
      });
    }

    console.log(`🔍 Valid domain found: "${domain}"`);
    
    const loginStatus = await browserRecordingService.checkDomainLogin(domain);
    console.log(`🔍 DEBUG: Login status from service:`, loginStatus);
    
    res.json({
      domain: domain,
      loginStatus, // Use the actual results from checkDomainLogin (with full browser names)
      message: `Checked login status for ${domain}`
    });

  } catch (error: any) {
    console.error('Failed to check domain login:', error);
    // Return "no login detected" for any other errors instead of 500
    res.json({
      domain: null,
      loginStatus: {
        "Microsoft Edge": false,
        "Google Chrome": false,
        "Mozilla Firefox": false
      },
      message: 'No login detected - Service error'
    });
  }
});

/**
 * Get available browsers and their profile status
 */
app.get('/api/browsers', async (req: any, res: any) => {
  try {
    console.log('🔍 Detecting available browsers...');
    
    // Add overall timeout for the entire browser detection process
    const browserDetectionPromise = browserRecordingService.detectAvailableBrowsers();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Browser detection timeout after 15 seconds')), 15000)
    );
    
    const browsers = await Promise.race([browserDetectionPromise, timeoutPromise]);
    
    console.log(`✅ Browser detection completed: ${browsers.filter(b => b.available).length} available`);
    
    res.json({
      browsers,
      message: `Found ${browsers.filter(b => b.available).length} available browsers`
    });

  } catch (error: any) {
    console.error('❌ Failed to detect browsers:', error);
    
    // Return fallback browsers if detection fails
    const fallbackBrowsers = [
      { type: 'chromium', name: 'Microsoft Edge', available: false },
      { type: 'chromium', name: 'Google Chrome', available: false },
      { type: 'firefox', name: 'Mozilla Firefox', available: false }
    ];
    
    res.status(200).json({
      browsers: fallbackBrowsers,
      message: 'Browser detection failed, showing fallback options',
      error: 'Failed to detect available browsers',
      details: error.message
    });
  }
});

/**
 * Start recording user actions - Phase 1
 */
app.post('/api/record/start', async (req: any, res: any) => {
  try {
    const { url, browserType, browserName, useProfile, name }: { 
      url: string;
      browserType?: 'chromium' | 'firefox' | 'webkit';
      browserName?: string;
      useProfile?: boolean;
      name?: string;
    } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'Invalid request: url required'
      });
    }

    const browserInfo = browserType ? ` using ${browserType}${browserName ? ` (${browserName})` : ''}${useProfile ? ' with profile' : ''}` : '';
    console.log(`📹 Starting recording session for: ${url}${browserInfo}`);
    
    // Use the proper recording service with options
    const session = await browserRecordingService.startRecording(url, {
      browserType,
      browserName,
      useProfile,
      name
    });
    
    res.json({
      sessionId: session.sessionId,
      status: 'recording',
      url: session.url,
      message: 'Browser launched - start interacting with the website'
    });

  } catch (error: any) {
    console.error('Failed to start recording:', error);
    res.status(500).json({
      error: 'Failed to start recording session',
      details: error.message
    });
  }
});
/**
 * Stop recording and get actions - Phase 1
 */
app.post('/api/record/stop', async (req: any, res: any) => {
  try {
    const { sessionId }: { sessionId: string } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Invalid request: sessionId required'
      });
    }

    console.log(`🛑 Stopping recording session: ${sessionId}`);
    
    // Use the proper recording service
    const session = await browserRecordingService.stopRecording(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Recording session not found'
      });
    }
    
    res.json({
      sessionId: session.sessionId,
      status: 'stopped',
      actionCount: session.actions.length,
      actions: session.actions,
      message: `Recording completed with ${session.actions.length} actions captured`
    });

  } catch (error: any) {
    console.error('Failed to stop recording:', error);
    res.status(500).json({
      error: 'Failed to stop recording session',
      details: error.message
    });
  }
});
/**
 * Get actions for active recording session - Phase 1
 */
app.get('/api/record/:sessionId/actions', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    const actions = await browserRecordingService.getSessionActions(sessionId);
    
    res.json({
      sessionId,
      actions,
      count: actions.length
    });

  } catch (error: any) {
    console.error('Failed to get session actions:', error);
    res.status(500).json({
      error: 'Failed to get session actions',
      details: error.message
    });
  }
});

/**
 * Delete a session
 */
app.delete('/api/sessions/:id', (req: any, res: any) => {
  try {
    const { id } = req.params;
    const deleted = sessions.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: id
      });
    }
    
    console.log(`Deleted session: ${id}`);
    res.status(204).send();
    
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      error: 'Failed to delete session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze a recorded session
 */
app.post('/api/sessions/:sessionId/analyze', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const { staticSectionMode = 'ignore' } = req.body; // Default to 'ignore' for main content only
    
    // Get the recording session
    const recordingSession = await browserRecordingService.getSession(sessionId);
    if (!recordingSession) {
      return res.status(404).json({
        error: 'Recording session not found',
        sessionId
      });
    }

    if (recordingSession.actions.length === 0) {
      return res.status(400).json({
        error: 'No actions to analyze',
        sessionId
      });
    }

    console.log(`Starting analysis of session ${sessionId} with ${recordingSession.actions.length} actions (static sections: ${staticSectionMode})`);

    // Calculate dynamic timeout based on action count
    const dynamicTimeout = calculateAnalysisTimeout(recordingSession.actions.length);
    console.log(`⏱️ Dynamic analysis timeout for ${recordingSession.actions.length} actions: ${dynamicTimeout / 1000}s (${Math.round(dynamicTimeout / 60000)} minutes)`);

    // Initialize analysis state tracking
    const analysisState: AnalysisState = {
      sessionId,
      status: 'analyzing',
      phase: 'replaying-actions',
      message: 'Starting analysis and replaying user actions...',
      startTime: new Date(),
      currentStep: 0,
      totalSteps: recordingSession.actions.length
    };
    analysisStates.set(sessionId, analysisState);

    // Return immediately with analysis ID, then process asynchronously
    res.json({
      analysisId: sessionId,
      status: 'analyzing',
      phase: analysisState.phase,
      message: analysisState.message,
      estimatedDuration: Math.round(dynamicTimeout / 60000) // Include estimated duration in minutes
    });

    console.log(`🔍 DEBUG: Recording session browser info:`);
    console.log(`  - browserType: ${recordingSession.browserType}`);
    console.log(`  - browserName: ${recordingSession.browserName}`);
    console.log(`  - useProfile: ${recordingSession.useProfile}`);

    // Process analysis asynchronously
    processAnalysisAsync(sessionId, recordingSession.actions, dynamicTimeout, { 
      staticSectionMode,
      browserType: recordingSession.browserType as 'chromium' | 'firefox' | 'webkit' || 'chromium',
      browserName: recordingSession.browserName,
      useProfile: recordingSession.useProfile
    });

  } catch (error) {
    console.error('Analysis start error:', error);
    res.status(500).json({
      error: 'Failed to start analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process analysis asynchronously with phase tracking
 */
async function processAnalysisAsync(sessionId: string, actions: UserAction[], dynamicTimeout: number, analysisOptions: { staticSectionMode?: string; browserType?: 'chromium' | 'firefox' | 'webkit'; browserName?: string; useProfile?: boolean } = {}) {
  const analysisState = analysisStates.get(sessionId);
  if (!analysisState) {
    console.error(`Analysis state not found for session ${sessionId}`);
    return;
  }

  try {
    // Initialize analyzer with browser profile parameters for authentication consistency
    const currentAnalyzer = await initializeAnalyzer(
      analysisOptions.browserType || 'chromium',
      analysisOptions.useProfile || false,
      analysisOptions.browserName
    );
    
    console.log(`🔍 Analysis initialized with: browser=${analysisOptions.browserName || analysisOptions.browserType}, profile=${analysisOptions.useProfile ? 'enabled' : 'disabled'}`);

    // Progress callback to update analysis state
    const onProgress = (
      phase: 'replaying-actions' | 'capturing-snapshots' | 'running-accessibility-checks' | 'processing-with-ai' | 'generating-report',
      message: string,
      step?: number,
      total?: number,
      snapshotCount?: number
    ) => {
      analysisState.phase = phase;
      analysisState.message = message;
      analysisState.currentStep = step;
      analysisState.totalSteps = total;
      if (snapshotCount !== undefined) {
        analysisState.snapshotCount = snapshotCount;
      }
      
      // For AI processing phase, use step/total as batch information
      if (phase === 'processing-with-ai' && step !== undefined && total !== undefined) {
        analysisState.batchCurrent = step;
        analysisState.batchTotal = total;
      }
      
      console.log(`📊 Phase: ${phase} - ${message}${step && total ? ` (${step}/${total})` : ''}${snapshotCount !== undefined ? ` [${snapshotCount} snapshots]` : ''}`);
    };
    
    // Run the actual analysis with real progress tracking and configurable timeouts
    const analysisPromise = currentAnalyzer.analyzeActions(actions, {
      sessionId: sessionId, // Use the recording session ID
      captureScreenshots: true,
      analyzeWithGemini: true,
      waitForStability: true,
      browserType: analysisOptions.browserType || 'chromium', // Use same browser type as recording
      browserName: analysisOptions.browserName, // Use same browser name as recording for profile consistency
      useProfile: analysisOptions.useProfile, // Use same profile setting as recording
      onProgress,
      // Pass timeout configurations to core analyzer
      llmComponentTimeout: LLM_COMPONENT_TIMEOUT,
      llmFlowTimeout: LLM_FLOW_TIMEOUT,
      // Pass static section mode to analyzer
      staticSectionMode: analysisOptions.staticSectionMode as 'include' | 'ignore' | 'separate'
    });

    // Set up timeout for analysis with dynamic timeout
    const timeoutMessage = `Analysis timeout after ${Math.round(dynamicTimeout / 60000)} minutes (${actions.length} actions)`;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), dynamicTimeout);
    });

    const result: AnalysisResult = await Promise.race([analysisPromise, timeoutPromise]);
    
    // Store analysis result
    if (result.success && result.manifest) {
      sessions.set(sessionId, result.manifest);
      analysisState.manifest = result.manifest;
    }

    // Mark as completed
    analysisState.status = 'completed';
    analysisState.phase = 'completed';
    analysisState.message = 'Analysis complete';
    analysisState.result = result;

    console.log(`✅ Analysis completed for session ${sessionId}`);

  } catch (error) {
    console.error(`❌ Analysis failed for session ${sessionId}:`, error);
    analysisState.status = 'failed';
    analysisState.message = `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Get analysis status and result
 */
app.get('/api/analysis/:analysisId/status', async (req: any, res: any) => {
  try {
    const { analysisId } = req.params;
    
    // Check if analysis is in progress
    const analysisState = analysisStates.get(analysisId);
    if (analysisState) {
      return res.json({
        status: analysisState.status,
        phase: analysisState.phase,
        message: analysisState.message,
        currentStep: analysisState.currentStep,
        totalSteps: analysisState.totalSteps,
        snapshotCount: analysisState.snapshotCount || 0,
        batchCurrent: analysisState.batchCurrent,
        batchTotal: analysisState.batchTotal,
        result: analysisState.result
      });
    }
    
    // Check for completed session in legacy storage
    const session = sessions.get(analysisId);
    if (session) {
      return res.json({
        status: 'completed' as const,
        phase: 'completed' as const,
        message: 'Analysis complete',
        result: {
          success: true,
          sessionId: analysisId,
          manifest: session,
          snapshotCount: session.totalSteps,
          snapshots: [] // TODO: Load actual snapshots
        }
      });
    }
    
    // Analysis not found
    return res.status(404).json({
      error: 'Analysis not found',
      analysisId
    });
    
  } catch (error: any) {
    console.error('Analysis status error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis status',
      details: error.message
    });
  }
});

/**
 * Get analysis result
 */
app.get('/api/analysis/:analysisId', async (req: any, res: any) => {
  try {
    const { analysisId } = req.params;
    const session = sessions.get(analysisId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Analysis not found',
        analysisId
      });
    }
    
    // Return the analysis result
    res.json({
      success: true,
      sessionId: analysisId,
      manifest: session,
      snapshotCount: session.totalSteps,
      snapshots: [] // TODO: Load actual snapshots
    });
    
  } catch (error: any) {
    console.error('Analysis result error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis result',
      details: error.message
    });
  }
});

/**
 * Global error handler
 */
app.use((error: Error, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Web Access Advisor API Server running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 API documentation: http://localhost:${PORT}/api`);
    });
    
    // Set server timeout to match base analysis timeout (prevent 1-minute default timeout)
    const httpTimeout = BASE_ANALYSIS_TIMEOUT + 60000; // Add 1 minute buffer
    server.setTimeout(httpTimeout);
    console.log(`⏱️ HTTP server timeout: ${httpTimeout / 1000}s (${Math.round(httpTimeout / 60000)} minutes)`);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * List saved recordings from consolidated snapshot structure
 */
app.get('/api/recordings', async (req: any, res: any) => {
  try {
    console.log('📋 Listing saved recordings from consolidated structure');
    
    // Use the recording service's method for consolidated structure
    const recordings = await browserRecordingService.listSavedRecordings();
    
    // Transform to match expected frontend format
    const transformedRecordings = recordings.map(recording => ({
      filename: `${recording.sessionId}.json`,
      sessionId: recording.sessionId,
      sessionName: recording.sessionName,
      url: recording.url,
      startTime: recording.startTime,
      endTime: recording.endTime,
      duration: recording.duration,
      actionCount: recording.actionCount,
      fileSize: 0, // Not available in new structure
      created: recording.startTime,
      // Authentication context for playback guidance
      recordingContext: {
        useProfile: recording.useProfile || false,
        browserType: recording.browserType,
        browserName: recording.browserName,
        authenticationNote: recording.useProfile 
          ? `Recorded with ${recording.browserName || recording.browserType} profile`
          : 'Recorded without profile (clean session)'
      }
    }));
    
    res.json(transformedRecordings);
  } catch (error) {
    console.error('❌ Failed to list recordings:', error);
    res.status(500).json({ 
      error: 'Failed to list recordings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Download a specific recording
 */
app.get('/api/recordings/:sessionId', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    // Use the recording service's method for consolidated structure
    const recording = await browserRecordingService.getSavedRecording(sessionId);
    
    if (!recording) {
      return res.status(404).json({
        error: 'Recording not found',
        sessionId
      });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${sessionId}.json"`);
    res.json(recording);
  } catch (error) {
    console.error('Failed to download recording:', error);
    res.status(500).json({
      error: 'Failed to download recording',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (analyzer) {
    await analyzer.cleanup();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (analyzer) {
    await analyzer.cleanup();
  }
  process.exit(0);
});

// Start the server
startServer();
