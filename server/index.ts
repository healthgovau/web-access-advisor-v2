/**
 * Web Access Advisor HTTP API Server
 * Express server that bridges React frontend to core analysis engine
 */

import express from 'express';
import cors from 'cors';
import { AccessibilityAnalyzer, SessionManifest } from '@web-access-advisor/core';
import type { 
  UserAction, 
  AnalysisOptions, 
  AnalysisResult
} from '@web-access-advisor/core';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global analyzer instance
let analyzer: AccessibilityAnalyzer | null = null;

// In-memory storage for sessions (replace with database in production)
const sessions = new Map<string, SessionManifest>();
const recordingSessions = new Map<string, {
  sessionId: string;
  status: 'recording' | 'stopped';
  actions: UserAction[];
  startTime: Date;
}>();

/**
 * Initialize analyzer
 */
async function initializeAnalyzer() {
  if (!analyzer) {
    analyzer = new AccessibilityAnalyzer();
    await analyzer.initialize();
    console.log('✓ Accessibility analyzer initialized');
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
 * Start recording user actions
 */
app.post('/api/record/start', async (req: any, res: any) => {
  try {
    const { url }: { url: string } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'Invalid request: url required'
      });
    }
    
    const sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize recording session
    recordingSessions.set(sessionId, {
      sessionId,
      status: 'recording',
      actions: [{
        type: 'navigate',
        url,
        timestamp: new Date().toISOString(),
        step: 1
      }],
      startTime: new Date()
    });
    
    console.log(`Started recording session: ${sessionId} for URL: ${url}`);
    
    res.json({
      sessionId,
      status: 'recording'
    });
    
  } catch (error) {
    console.error('Start recording error:', error);
    res.status(500).json({
      error: 'Failed to start recording',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stop recording and get actions
 */
app.post('/api/record/stop', async (req: any, res: any) => {
  try {
    const { sessionId }: { sessionId: string } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Invalid request: sessionId required'
      });
    }
    
    const recordingSession = recordingSessions.get(sessionId);
    
    if (!recordingSession) {
      return res.status(404).json({
        error: 'Recording session not found',
        sessionId
      });
    }
    
    // Mark as stopped
    recordingSession.status = 'stopped';
    
    console.log(`Stopped recording session: ${sessionId} with ${recordingSession.actions.length} actions`);
    
    res.json({
      sessionId,
      actions: recordingSession.actions
    });
    
    // Clean up recording session after some time
    setTimeout(() => {
      recordingSessions.delete(sessionId);
    }, 60000); // Clean up after 1 minute
    
  } catch (error) {
    console.error('Stop recording error:', error);
    res.status(500).json({
      error: 'Failed to stop recording',
      message: error instanceof Error ? error.message : 'Unknown error'
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
