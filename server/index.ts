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
import { AccessibilityAnalyzer, SessionManifest } from '@web-access-advisor/core';
import { browserRecordingService } from './recordingService.js';
import type { 
  UserAction, 
  AnalysisOptions, 
  AnalysisResult
} from '@web-access-advisor/core';

const app = express();
const PORT = process.env.API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global analyzer instance
let analyzer: AccessibilityAnalyzer | null = null;

// In-memory storage for analysis sessions (replace with database in production)
const sessions = new Map<string, SessionManifest>();

/**
 * Initialize analyzer
 */
async function initializeAnalyzer() {
  if (!analyzer) {
    analyzer = new AccessibilityAnalyzer();
    const geminiApiKey = process.env.GEMINI_API_KEY;
    console.log(`🔍 Environment check: GEMINI_API_KEY = ${geminiApiKey ? '[SET]' : '[NOT SET]'}`);
    await analyzer.initialize(geminiApiKey);
    console.log('✓ Accessibility analyzer initialized');
    if (geminiApiKey) {
      console.log('✓ Gemini AI service enabled');
    } else {
      console.log('⚠️ Gemini AI service disabled - no API key provided');
    }
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

    const currentAnalyzer = await initializeAnalyzer();
    
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
 * Start recording user actions - Phase 1
 */
app.post('/api/record/start', async (req: any, res: any) => {
  try {
    const { url }: { url: string } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'Invalid request: url required'
      });
    }

    console.log(`📹 Starting recording session for: ${url}`);
    
    // Use the proper recording service
    const session = await browserRecordingService.startRecording(url);
    
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
app.get('/api/record/:sessionId/actions', (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    const actions = browserRecordingService.getSessionActions(sessionId);
    
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

    console.log(`Starting analysis of session ${sessionId} with ${recordingSession.actions.length} actions`);

    const currentAnalyzer = await initializeAnalyzer();
    
    // Run the analysis with timeout
    const analysisPromise = currentAnalyzer.analyzeActions(recordingSession.actions, {
      captureScreenshots: true,
      analyzeWithGemini: true,
      waitForStability: true
    });

    // Set up timeout for analysis (5 minutes)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout after 5 minutes')), 5 * 60 * 1000);
    });

    const result: AnalysisResult = await Promise.race([analysisPromise, timeoutPromise]);
    
    // Store analysis result in session storage
    if (result.success && result.manifest) {
      sessions.set(sessionId, result.manifest);
    }

    res.json({
      analysisId: result.sessionId,
      status: 'completed',
      result: result
    });

  } catch (error: any) {
    console.error('Session analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze session',
      details: error.message,
      sessionId: req.params.sessionId
    });
  }
});

/**
 * Get analysis status and result
 */
app.get('/api/analysis/:analysisId/status', async (req: any, res: any) => {
  try {
    const { analysisId } = req.params;
    const session = sessions.get(analysisId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Analysis not found',
        analysisId
      });
    }
    
    // For completed sessions, return completed status with result
    res.json({
      status: 'completed' as const,
      result: {
        success: true,
        sessionId: analysisId,
        manifest: session,
        snapshotCount: session.totalSteps,
        snapshots: [] // TODO: Load actual snapshots
      }
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
    // Initialize analyzer on startup
    await initializeAnalyzer();
    
    app.listen(PORT, () => {
      console.log(`🚀 Web Access Advisor API Server running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 API documentation: http://localhost:${PORT}/api`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * List saved recordings
 */
app.get('/api/recordings', async (req: any, res: any) => {
  try {
    const { readdir, stat } = await import('fs/promises');
    const path = await import('path');
    
    const recordingsDir = './recordings';
    
    try {
      const files = await readdir(recordingsDir);
      const recordings = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(recordingsDir, file);
          const stats = await stat(filePath);
          const { readFile } = await import('fs/promises');
          
          try {
            const content = await readFile(filePath, 'utf8');
            const recording = JSON.parse(content);
            
            recordings.push({
              filename: file,
              sessionId: recording.sessionId,
              sessionName: recording.sessionName,
              url: recording.url,
              startTime: recording.startTime,
              endTime: recording.endTime,
              duration: recording.duration,
              actionCount: recording.actionCount,
              fileSize: stats.size,
              created: stats.mtime
            });
          } catch (parseError) {
            console.error(`Failed to parse recording file ${file}:`, parseError);
          }
        }
      }
      
      // Sort by creation time (newest first)
      recordings.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      res.json(recordings);
    } catch (error) {
      // Directory doesn't exist or is empty
      res.json([]);
    }
  } catch (error) {
    console.error('Failed to list recordings:', error);
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
    const { readFile } = await import('fs/promises');
    const path = await import('path');
    
    const filePath = path.join('./recordings', `${sessionId}.json`);
    
    try {
      const content = await readFile(filePath, 'utf8');
      const recording = JSON.parse(content);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${sessionId}.json"`);
      res.json(recording);
    } catch (error) {
      res.status(404).json({
        error: 'Recording not found',
        sessionId
      });
    }
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
