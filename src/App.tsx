/**
 * Main App component for Web Access Advisor
 * Accessibility testing tool with recording/replay functionality
 */

import { useState, useEffect, useRef } from 'react';
import { QueryProvider } from './services/queryClient';
import URLInput from './components/URLInput';
import RecordingControls from './components/RecordingControls';
import ActionList from './components/ActionList';
import ThreePhaseStatus from './components/ThreePhaseStatus';
import AnalysisResults from './components/AnalysisResults';
import AnalysisControls from './components/AnalysisControls';
import ErrorDisplay from './components/ErrorDisplay';
import * as recordingApi from './services/recordingApi';
import type { AppState, ProgressStage } from './types';
import './App.css';

function App() {
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

      console.log(`Recording stopped. Captured ${state.actions.length} actions`);
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
        error: undefined      }); updateProgress('preparing-analysis', 'Initializing accessibility analysis');

      if (state.actions.length === 0) {
        throw new Error('No actions to analyze');
      } console.log(`Starting analysis of ${state.actions.length} actions`);

      updateProgress('replaying-actions', 'Replaying actions in headless browser');
      
      // Brief delay to show the replaying phase
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateProgress('capturing-snapshots', 'Capturing accessibility snapshots');
      
      // Brief delay to show the capturing phase
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateProgress('processing-with-ai', 'Processing with AI accessibility analysis');

      // Start the analysis
      const response = await recordingApi.analyzeSession(state.sessionId);if (response.status === 'completed' && response.result) {        // Check for warnings (e.g., Gemini not available)
        if (response.result.warnings && response.result.warnings.length > 0) {
          const warningMessage = response.result.warnings[0];
          if (warningMessage.includes('Gemini') || warningMessage.includes('AI analysis unavailable')) {
            updateProgress('completed', 'Analysis complete', undefined, 'AI analysis unavailable - Gemini API not configured');
          } else {
            updateProgress('completed', 'Analysis complete', undefined, `Warning: ${warningMessage}`);
          }
        } else {
          updateProgress('completed', 'Analysis complete', undefined, 'Report generated successfully');
        }
        updateState({
          mode: 'results',
          analysisResult: response.result,
          loading: false
        });
      } else {
        // Poll for analysis completion with progress updates
        updateProgress('replaying-actions', 'Replaying actions in headless browser');

        const pollAnalysis = async () => {
          try {
            const statusResponse = await recordingApi.getAnalysisStatus(response.analysisId);

            // Update progress based on analysis stage
            if (statusResponse.status === 'analyzing') {
              updateProgress('processing-with-ai', 'Processing with AI accessibility analysis');
            }

            if (statusResponse.status === 'completed' && statusResponse.result) {
              // Check for warnings in the final result
              if (statusResponse.result.warnings && statusResponse.result.warnings.length > 0) {
                const warningMessage = statusResponse.result.warnings[0];
                if (warningMessage.includes('Gemini') || warningMessage.includes('AI analysis unavailable')) {
                  updateProgress('completed', 'Analysis complete', undefined, 'AI analysis unavailable - Gemini API not configured');
                } else {
                  updateProgress('completed', 'Analysis complete', undefined, `Warning: ${warningMessage}`);
                }
              } else {
                updateProgress('completed', 'Analysis complete', undefined, 'Report generated successfully');
              }

              updateState({
                mode: 'results',
                analysisResult: statusResponse.result,
                loading: false
              });
            } else {
              setTimeout(pollAnalysis, 2000); // Check every 2 seconds
            }
          } catch (error) {
            updateProgress('error', 'Analysis failed', undefined, undefined, error instanceof Error ? error.message : 'Unknown error');
            updateState({
              error: error instanceof Error ? error.message : 'Analysis failed',
              loading: false,
              mode: 'results'
            });
          }
        }; setTimeout(pollAnalysis, 2000);
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
  };
  // Reset to start over
  const handleReset = () => {
    stopActionPolling();
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

  // Clear error after 5 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        updateState({ error: undefined });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopActionPolling();
    };
  }, []);

  // Update progress helper
  const updateProgress = (stage: ProgressStage, message: string, progress?: number, details?: string, error?: string) => {
    setState(prev => ({
      ...prev,
      progress: { stage, message, progress, details, error }
    }));
  };

  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50">        <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">
                Web Access Advisor
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-powered accessibility testing and analysis
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Mode: <span className="font-medium capitalize">{state.mode}</span>
            </div>
          </div>
        </div>
      </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* URL Input - Always visible at top */}
            {state.mode === 'setup' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-medium text-gray-900 mb-6">
                  Website to Test
                </h2>
                <URLInput
                  url={state.url}
                  onUrlChange={handleUrlChange}
                  onNavigate={handleNavigateAndRecord}
                  isLoading={state.loading}
                />
              </div>
            )}            {/* Three-Phase Status - Always visible */}            <ThreePhaseStatus
              currentStage={state.progress.stage}
              error={state.progress.error}
              actionCount={state.actions.length}
              snapshotCount={state.analysisResult?.snapshotCount || 0}
              warnings={state.analysisResult?.warnings || []}
            />{/* Error Display */}
            {state.error && <ErrorDisplay error={state.error} />}{/* Setup Mode - URL input moved above */}
            {state.mode === 'setup' && (
              <></>
            )}

            {/* Recording Mode */}
            {state.mode === 'recording' && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Recording Session
                  </h2>                  <RecordingControls
                    isRecording={true}
                    onStartRecording={handleNavigateAndRecord}
                    onStopRecording={handleStopRecording}
                    hasActions={state.actions.length > 0}
                    isNavigated={true}
                  />
                  <div className="mt-4 text-sm text-gray-600">
                    Currently recording actions on: <span className="font-medium">{state.url}</span>
                  </div>
                </div>

                {/* Actions List */}
                {state.actions.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Recorded Actions ({state.actions.length})
                    </h2>
                    <ActionList
                      actions={state.actions}
                      isRecording={state.mode === 'recording'}
                    />
                  </div>
                )}
              </>
            )}            {/* Analyzing Mode */}
            {state.mode === 'analyzing' && (
              <div className="bg-white rounded-lg shadow p-6">                <h2 className="text-lg font-medium text-gray-900 mb-4">
                Analyzing Accessibility
              </h2>
                <div className="text-sm text-gray-600">
                  Analyzing {state.actions.length} recorded actions for accessibility issues.
                </div>
              </div>
            )}

            {/* Results Mode */}            {state.mode === 'results' && (
              <>
                <AnalysisControls
                  hasActions={state.actions.length > 0}
                  hasAnalysisResult={!!state.analysisResult}
                  isLoading={state.loading}
                  onStartAnalysis={handleStartAnalysis}
                  onReset={handleReset}
                />                {/* Actions List */}
                {state.actions.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Recorded Actions
                    </h2>
                    {/* Session info below heading */}
                    {state.sessionId && (
                      <div className="text-xs text-gray-500 mb-4">
                        Session ID: {state.sessionId}
                      </div>
                    )}
                    <ActionList
                      actions={state.actions}
                      isRecording={false}
                    />
                  </div>
                )}

                {/* Analysis Results */}
                {state.analysisResult && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Accessibility Analysis Results
                    </h2>                    <AnalysisResults
                      analysisData={state.analysisResult}
                      isLoading={state.loading}
                      error={state.error || null}
                    />                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center text-sm text-gray-500">
              <p>Web Access Advisor v2.0</p>
            </div>
          </div>
        </footer>
      </div>
    </QueryProvider>
  );
}

export default App;
