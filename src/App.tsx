/**
 * Main App component for Web Access Advisor
 * Accessibility testing tool with recording/replay functionality
 */

import { useState, useEffect, useRef } from 'react';
import { QueryProvider } from './services/queryClient';
import URLInput from './components/URLInput';
import ActionList from './components/ActionList';
import ThreePhaseStatus from './components/ThreePhaseStatus';
import AnalysisResults from './components/AnalysisResults';
import AnalysisControls from './components/AnalysisControls';
import ErrorDisplay from './components/ErrorDisplay';
import SessionModeToggle from './components/SessionModeToggle';
import SessionSelector from './components/SessionSelector';
import { useAccessibilityAnalysis } from './hooks/useAccessibilityAnalysis';
import { exportAnalysisToPDF } from './utils/pdfExport';
import * as recordingApi from './services/recordingApi';
import type { AppState, ProgressStage } from './types';
import './App.css';

const InfoIcon: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label }) => (
  <button
    type="button"
    aria-label={label || 'Show accessibility analysis information'}
    onClick={onClick}
    className="mr-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-full transition-colors"
  >
    <svg className="w-5 h-5 text-gray-500 hover:text-gray-700" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  </button>
);

const InfoModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-info-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="accessibility-info-title" className="text-xl font-semibold text-gray-900 text-left">
            Accessibility Analysis Results: Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-1"
            aria-label="Close information dialog"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 text-left">
          <div className="space-y-8 text-gray-700 max-w-none">
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-left">What do the different analysis modes do?</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold text-gray-900">Axe (Automated Testing):</span>
                  <span className="block text-gray-600 leading-relaxed">
                    An automated accessibility engine that scans the DOM structure to detect common WCAG violations. It checks for issues like missing alt text, poor color contrast, improper heading structure, form labeling problems, and ARIA implementation errors. Fast and reliable for catching obvious accessibility barriers.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">LLM/AI Analysis:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    Uses a large language model to analyze screenshots and DOM structure with human-like understanding. Provides contextual insights, identifies complex usability issues, suggests specific improvements, and can spot patterns that automated tools miss. Offers explanations and recommendations in natural language.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Replay/Interaction Testing:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    Replays your recorded user interactions to test dynamic accessibility features. Checks for focus trap issues in modals, keyboard navigation problems, proper focus management, and interactive element accessibility. Captures the user experience across your entire workflow.
                  </span>
                </li>
              </ul>
            </section>
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-left">Important limitations and considerations</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold text-gray-900">AI/LLM Limitations:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    Language models can make mistakes, hallucinate issues, or miss subtle problems. Their analysis is not exhaustive and should never be considered a substitute for expert human review or real user testing.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Educational Purpose:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    This tool is designed to help you learn about accessibility and identify potential issues. It does not guarantee WCAG compliance or replace professional accessibility audits.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Automated Testing Limitations:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    Automated tools can only detect a subset of accessibility issues. Many barriers require human judgment, context understanding, and real user experience to identify.
                  </span>
                </li>
              </ul>
            </section>
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-left">How to get the most value from these results</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold text-gray-900">Review All Reports Together:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    Each analysis method (Axe, LLM, Replay) catches different types of issues. Use them in combination for a more complete picture. Cross-reference findings and prioritize issues that appear in multiple reports.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Run Multiple Times:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    Run the analysis several times, especially for dynamic content. LLM analysis can vary between runs, and different user flows may reveal different issues. Test various scenarios and user paths.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Essential: Real User Testing:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    <span className="font-bold">Always conduct testing with people with disabilities.</span> No automated tool or AI can replace the insights from users who actually rely on assistive technologies. Their lived experience will reveal issues and solutions that no algorithm can detect.
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Use as Learning Tool:</span>
                  <span className="block text-gray-600 leading-relaxed">
                    Treat this analysis as a starting point for learning about accessibility. Research the issues found, understand the underlying principles, and gradually build your accessibility knowledge and awareness.
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast component for bottom-left error notifications
const Toast: React.FC<{
  message: string;
  id: string;
  onDismiss: (id: string) => void;
  type?: 'error' | 'info';
}> = ({ message, id, onDismiss, type = 'error' }) => (
  <div
    className={`mb-4 ml-4 px-4 py-3 rounded shadow-lg flex items-start max-w-xs w-full bg-${type === 'error' ? 'red' : 'blue'}-700 text-white animate-fade-in`}
    role="alert"
    tabIndex={0}
    aria-live="assertive"
  >
    <span className="mr-2 mt-0.5">
      {type === 'error' ? (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff2" /><path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      ) : (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff2" /><path d="M12 16h.01M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      )}
    </span>
    <span className="flex-1 text-sm whitespace-pre-line">{message}</span>
    <button
      onClick={() => onDismiss(id)}
      className="ml-3 text-white hover:text-gray-200 focus:outline-none"
      aria-label="Dismiss notification"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    </button>
  </div>
);

function App() {
  // Session mode state
  const [sessionMode, setSessionMode] = useState<'new' | 'load'>('new');

  // Main application state
  const [state, setState] = useState<AppState>({
    mode: 'setup',
    url: '',
    actions: [],
    loading: false,
    progress: {
      stage: 'idle',
      message: 'Ready to start accessibility testing'
    }
  });
  // Polling interval reference
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  // Analysis results ref for PDF export
  const analysisResultsRef = useRef<HTMLDivElement | null>(null);
  // PDF export state
  const [isExporting, setIsExporting] = useState(false);
  // Info modal state
  const [infoOpen, setInfoOpen] = useState(false);
  // Toast state for error notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'error' | 'info' }[]>([]);

  // Accessibility analysis hook
  const { handleAnalysisResult } = useAccessibilityAnalysis();
  // PDF Export handler
  const handleExportPDF = async () => {
    if (!state.analysisResult) return;

    setIsExporting(true);
    try {
      await exportAnalysisToPDF(state.analysisResult, state.actions);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Update state helper
  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  // Handle URL changes
  const handleUrlChange = (url: string) => {
    updateState({ url });
  };

  // Start action polling during recording
  const startActionPolling = (sessionId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await recordingApi.getSessionActions(sessionId);
        updateState({ actions: response.actions });
      } catch (error) {
        console.error('Failed to poll actions:', error);
      }
    }, 1000); // Poll every second
  };

  // Stop action polling
  const stopActionPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };  // Handle navigate & start recording
  const handleNavigateAndRecord = async () => {
    try {
      updateState({ loading: true, error: undefined }); updateProgress('starting-browser', 'Initializing browser environment', 10);

      if (!state.url.trim()) {
        throw new Error('Please enter a URL to test');
      }

      updateProgress('starting-browser', 'Launching browser session');

      // Start recording session
      const response = await recordingApi.startRecordingSession({
        url: state.url
      });

      updateProgress('recording', 'Browser ready - interact with the website to record actions');

      updateState({
        mode: 'recording',
        sessionId: response.sessionId,
        actions: [],
        loading: false
      });

      // Start polling for actions
      startActionPolling(response.sessionId);
    } catch (error) {
      updateProgress('error', 'Failed to start recording', undefined, undefined, error instanceof Error ? error.message : 'Unknown error');
      updateState({
        error: error instanceof Error ? error.message : 'Failed to start recording',
        loading: false
      });
    }
  };
  // Handle recording stop
  const handleStopRecording = async () => {
    if (!state.sessionId) return;

    try {
      updateState({ loading: true }); updateProgress('stopping-recording', 'Saving recorded actions');

      // Stop polling first
      stopActionPolling();

      updateProgress('stopping-recording', 'Completing recording session');      // Stop the recording session
      await recordingApi.stopRecordingSession(state.sessionId);

      updateProgress('recording-complete', `Recording complete: ${state.actions.length} actions captured`, undefined, 'Ready for accessibility analysis');

      updateState({
        mode: 'results',
        loading: false
      });

    } catch (error) {
      updateProgress('error', 'Failed to stop recording', undefined, undefined, error instanceof Error ? error.message : 'Unknown error');
      updateState({
        error: error instanceof Error ? error.message : 'Failed to stop recording',
        loading: false
      });
    }
  };

  // Handle analysis start
  const handleStartAnalysis = async () => {
    if (!state.sessionId) return; try {
      updateState({
        mode: 'analyzing',
        loading: true,
        error: undefined
      }); updateProgress('preparing-analysis', 'Initializing accessibility analysis');

      if (state.actions.length === 0) {
        throw new Error('No actions to analyze');
      }

      updateProgress('replaying-actions', 'Replaying actions in headless browser');

      // Brief delay to show the replaying phase
      await new Promise(resolve => setTimeout(resolve, 800)); updateProgress('capturing-snapshots', 'Capturing accessibility snapshots');
      // Start the analysis
      const response = await recordingApi.analyzeSession(state.sessionId);

      if (response.status === 'completed' && response.result) {
        // Analysis completed immediately (unlikely but possible)
        const resultHandler = handleAnalysisResult(response.result);
        updateProgress(resultHandler.stage, resultHandler.message, undefined, resultHandler.details);
        updateState({
          mode: 'results',
          analysisResult: response.result,
          loading: false
        });
      } else {
        // Poll for analysis completion - backend is now processing
        const pollAnalysis = async () => {
          try {
            const statusResponse = await recordingApi.getAnalysisStatus(response.analysisId);

            if (statusResponse.phase && statusResponse.message) {
              // Map backend phases to frontend progress stages
              const stageMapping: Record<string, ProgressStage> = {
                'replaying-actions': 'replaying-actions',
                'capturing-snapshots': 'capturing-snapshots',
                'running-accessibility-checks': 'running-accessibility-checks',
                'processing-with-ai': 'processing-with-ai',
                'generating-report': 'generating-report',
                'completed': 'completed'
              };

              const frontendStage = stageMapping[statusResponse.phase] || statusResponse.phase as ProgressStage;

              // Update progress with real-time snapshot count

              updateProgress(frontendStage, statusResponse.message, undefined, undefined, undefined, statusResponse.snapshotCount);
            } if (statusResponse.status === 'completed' && statusResponse.result) {
              // Analysis complete - handle result

              const resultHandler = handleAnalysisResult(statusResponse.result);
              updateProgress(resultHandler.stage, resultHandler.message, undefined, resultHandler.details, undefined, statusResponse.result.snapshotCount);

              updateState({
                mode: 'results',
                analysisResult: statusResponse.result,
                loading: false
              });
              return; // Stop polling
            }

            if (statusResponse.status === 'failed') {
              // Analysis failed
              updateProgress('error', statusResponse.message || 'Analysis failed');
              updateState({
                error: statusResponse.message || 'Analysis failed',
                loading: false,
                mode: 'results'
              });
              return; // Stop polling
            }

            // Analysis still in progress - continue polling
            setTimeout(pollAnalysis, 2000);
          } catch (error) {
            console.error('Analysis polling error:', error);
            updateProgress('error', 'Analysis failed', undefined, undefined, error instanceof Error ? error.message : 'Unknown error');
            updateState({
              error: error instanceof Error ? error.message : 'Analysis failed',
              loading: false,
              mode: 'results'
            });
          }
        };

        // Start polling immediately
        setTimeout(pollAnalysis, 1000);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start analysis';      // Handle specific error types
      if (errorMessage.includes('token') || errorMessage.includes('limit')) {
        updateProgress('error', 'AI processing limit reached', undefined, 'Try reducing the number of actions or try again later', errorMessage);
      } else if (errorMessage.includes('Gemini') || errorMessage.includes('API key') || errorMessage.includes('service not available')) {
        updateProgress('error', 'AI analysis unavailable', undefined, 'Gemini AI service is not configured. Analysis completed with basic accessibility scan only.', errorMessage);
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        updateProgress('error', 'Network connection error', undefined, 'Check your internet connection and try again', errorMessage);
      } else {
        updateProgress('error', 'Analysis failed', undefined, 'An unexpected error occurred', errorMessage);
      }

      updateState({
        error: errorMessage,
        loading: false,
        mode: 'results'
      });
    }
  };  // Reset to start over
  const handleReset = () => {
    stopActionPolling();
    setSessionMode('new'); // Reset to new recording mode
    updateState({
      mode: 'setup',
      url: '',
      sessionId: undefined,
      actions: [],
      analysisResult: undefined,
      error: undefined,
      loading: false,
      progress: {
        stage: 'idle',
        message: 'Ready to start accessibility testing'
      }
    });
  };

  // Handle session mode change
  const handleSessionModeChange = (mode: 'new' | 'load') => {
    setSessionMode(mode);
    // Reset state when switching modes
    updateState({
      mode: 'setup',
      url: '',
      sessionId: undefined,
      actions: [],
      analysisResult: undefined,
      error: undefined,
      loading: false,
      progress: {
        stage: 'idle',
        message: 'Ready to start accessibility testing'
      }
    });
  };
  // Handle loading a saved session
  const handleLoadSession = async (sessionId: string) => {
    try {
      updateState({ loading: true, error: undefined });
      updateProgress('preparing-analysis', 'Loading saved session'); const sessionData = await recordingApi.loadSavedSession(sessionId);

      updateProgress('recording-complete', `Session loaded: ${sessionData.actionCount} actions`, undefined, 'Ready for accessibility analysis');

      updateState({
        mode: 'results',
        sessionId: sessionData.sessionId,
        url: sessionData.url,
        actions: sessionData.actions,
        loading: false,
        progress: {
          stage: 'recording-complete',
          message: `Session "${sessionData.sessionName}" loaded successfully`,
          details: 'Ready for accessibility analysis'
        }
      });

    } catch (error) {
      updateProgress('error', 'Failed to load session', undefined, undefined, error instanceof Error ? error.message : 'Unknown error');
      updateState({
        error: error instanceof Error ? error.message : 'Failed to load session',
        loading: false
      });
    }
  };

  // Clear error after 30 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        updateState({ error: undefined });
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopActionPolling();
    };
  }, []);  // Update progress helper
  const updateProgress = (stage: ProgressStage, message: string, progress?: number, details?: string, error?: string, snapshotCount?: number) => {

    setState(prev => ({
      ...prev,
      progress: { stage, message, progress, details, error, snapshotCount }
    }));
  };

  // Helper to add a toast
  const addToast = (message: string, type: 'error' | 'info' = 'error') => {
    setToasts((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, message, type },
    ]);
  };
  // Helper to dismiss a toast
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Show toast on error (including LLM failures)
  useEffect(() => {
    if (state.error) {
      addToast(state.error, 'error');
    }
  }, [state.error]);

  return (
    <QueryProvider>
      <div className="min-h-screen">
        {/* Toast container - bottom left */}
        <div className="fixed bottom-0 left-0 z-50 flex flex-col items-start pointer-events-none">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
          ))}
        </div>
        <header className="bg-white">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-3xl font-bold text-brand-dark">
                Web Access Advisor <span className="text-xl font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded-md">alpha</span>
              </h1>
              <p className="text-base text-slate mt-1">
                AI-powered accessibility testing and analysis
              </p>
            </div>
            <div className="text-base text-slate">
              Service Mode: <span className="font-medium capitalize">{state.mode}</span>
            </div>
          </div>
        </header>        <main className="mt-8">
          <div className="space-y-6">          {/* Session Mode - Always visible */}
            {state.mode === 'setup' || (state.mode === 'results' && sessionMode === 'load' && !state.analysisResult) ? (
              // Interactive session mode during setup or when in results mode with loaded session (before analysis)
              <>
                <SessionModeToggle
                  mode={sessionMode}
                  onModeChange={handleSessionModeChange}
                  disabled={state.loading}
                />

                {sessionMode === 'new' ? (
                  <URLInput
                    url={state.url}
                    onUrlChange={handleUrlChange}
                    onNavigate={handleNavigateAndRecord}
                    isLoading={state.loading}
                  />
                ) : (
                  <SessionSelector
                    onSessionSelect={handleLoadSession}
                    isLoading={state.loading}
                  />
                )}
              </>
            ) : state.mode === 'analyzing' || (state.mode === 'results' && state.analysisResult) ? (
              // Read-only session mode indicator during analysis or when analysis is complete
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3 flex-wrap">
                    <span className="text-sm font-bold text-gray-700">Session:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${sessionMode === 'new'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                      }`}>
                      {sessionMode === 'new' ? 'New Recording' : 'Loaded Session'}
                    </span>                  {state.sessionId && (
                      <span className="text-sm text-gray-600 font-mono">
                        <span className="font-bold">ID:</span> {state.sessionId}
                      </span>
                    )}
                    {state.url && (
                      <span className="text-sm text-gray-600">
                        <span className="font-bold">Start URL:</span> {state.url}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}{/* Three-Phase Status - Always visible */}
            <ThreePhaseStatus
              currentStage={state.progress.stage}
              error={state.progress.error}
              actionCount={state.actions.length}
              snapshotCount={(() => {
                const snapshotCount = state.progress.snapshotCount || state.analysisResult?.snapshotCount || 0;
                return snapshotCount;
              })()}
              warnings={state.analysisResult?.warnings || []}
            />            {/* Error Display */}
            {state.error && <ErrorDisplay error={state.error} />}

            {/* Recording Mode */}
            {state.mode === 'recording' && (
              <>                <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Recording Session
                  </h2>                    <button
                    onClick={handleStopRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                  >
                    <span>Stop Recording</span>
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </button>
                </div>                  <div className="text-sm text-gray-600 text-left">
                  Currently recording actions on: <span className="font-medium">{state.url}</span>
                </div>
              </div>                {/* Actions List */}
                {state.actions.length > 0 && (
                  <ActionList
                    actions={state.actions}
                    isRecording={state.mode === 'recording'}
                    sessionId={state.sessionId}
                  />
                )}
              </>
            )}            {/* Analyzing Mode */}
            {state.mode === 'analyzing' && (
              <>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card">
                  <div className="flex items-center justify-center py-6 px-2 relative">
                    <div className="text-center">
                      <h2 className="text-xl font-medium text-gray-900">
                        Analyzing Accessibility
                      </h2>
                      <div className="text-sm text-gray-500 mt-1">
                        Analyzing {state.actions.length} recorded actions for accessibility issues.
                      </div>
                    </div>
                  </div>
                </div>{/* Actions List - Keep visible during analysis for consistency */}
                {state.actions.length > 0 && (
                  <ActionList
                    actions={state.actions}
                    isRecording={false}
                    sessionId={state.sessionId}
                  />
                )}
              </>
            )}

            {/* Results Mode */}            {state.mode === 'results' && (
              <>
                <AnalysisControls
                  hasActions={state.actions.length > 0}
                  hasAnalysisResult={!!state.analysisResult}
                  isLoading={state.loading}
                  onStartAnalysis={handleStartAnalysis}
                  onReset={handleReset} />                {/* Actions List */}
                {state.actions.length > 0 && (
                  <ActionList
                    actions={state.actions}
                    isRecording={false}
                    sessionId={state.sessionId}
                  />
                )}                {/* Analysis Results */}
                {state.analysisResult && (
                  <div className="card rounded-lg overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center w-20">
                          <InfoIcon onClick={() => setInfoOpen(true)} />
                        </div>
                        <h2 className="text-xl font-medium text-gray-900 text-center flex-1">
                          Accessibility Analysis Results
                        </h2>
                        <div className="flex items-center justify-end w-20">
                          <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="text-sm">📄</span>
                            <span className="text-sm font-medium whitespace-nowrap">
                              {isExporting ? 'Generating PDF...' : 'Export PDF'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* HR separator to emphasize master header - full width */}
                    <hr className="border-gray-200" />

                    <div className="px-6 pb-6 pt-6">
                      <div ref={analysisResultsRef}>
                        <AnalysisResults
                          analysisData={state.analysisResult}
                          isLoading={state.loading}
                          error={state.error || null}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Info Modal */}
        <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

        <footer className="mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="text-center text-sm" style={{ color: 'var(--silver)' }}>
              <p>Web Access Advisor v2 (alpha)</p>
            </div>
          </div>
        </footer>
      </div>
    </QueryProvider>
  );
}

export default App;
