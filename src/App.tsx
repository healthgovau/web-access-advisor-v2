/**
 * Main App component for Web Access Advisor
 * Accessibility testing tool with recording/replay functionality
 */

import { useState, useEffect, useRef } from 'react';
import { QueryProvider } from './services/queryClient';
import URLInput from './components/URLInput';
import RecordingControls from './components/RecordingControls';
import ActionList from './components/ActionList';
import ProgressIndicator from './components/ProgressIndicator';
import AnalysisResults from './components/AnalysisResults';
import * as recordingApi from './services/recordingApi';
import type { AppState } from './types';
import './App.css';

function App() {
  // Main application state
  const [state, setState] = useState<AppState>({
    mode: 'setup',
    url: '',
    sessionName: '',
    actions: [],
    loading: false
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

  // Handle session name changes  
  const handleSessionNameChange = (name: string) => {
    updateState({ sessionName: name });
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
  };

  // Handle navigate & start recording
  const handleNavigateAndRecord = async () => {
    try {
      updateState({ loading: true, error: undefined });

      if (!state.url.trim()) {
        throw new Error('Please enter a URL to test');
      }

      if (!state.sessionName.trim()) {
        updateState({ sessionName: `Session ${new Date().toLocaleString()}` });
      }

      // Start recording session
      const response = await recordingApi.startRecordingSession({
        url: state.url,
        name: state.sessionName || `Session ${new Date().toLocaleString()}`
      });

      updateState({
        mode: 'recording',
        sessionId: response.sessionId,
        actions: [],
        loading: false
      });

      // Start polling for actions
      startActionPolling(response.sessionId);

    } catch (error) {
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
      updateState({ loading: true });
      
      // Stop polling first
      stopActionPolling();

      // Stop the recording session
      await recordingApi.stopRecordingSession(state.sessionId);

      updateState({ 
        mode: 'results',
        loading: false 
      });

      console.log(`Recording stopped. Captured ${state.actions.length} actions`);
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Failed to stop recording',
        loading: false
      });
    }
  };

  // Handle analysis start
  const handleStartAnalysis = async () => {
    if (!state.sessionId) return;

    try {
      updateState({ 
        mode: 'analyzing',
        loading: true, 
        error: undefined 
      });
      
      if (state.actions.length === 0) {
        throw new Error('No actions to analyze');
      }

      console.log(`Starting analysis of ${state.actions.length} actions`);
      
      // Start the analysis
      const response = await recordingApi.analyzeSession(state.sessionId);
      
      if (response.status === 'completed' && response.result) {
        updateState({ 
          mode: 'results',
          analysisResult: response.result,
          loading: false 
        });
      } else {
        // Poll for analysis completion
        const pollAnalysis = async () => {
          try {
            const statusResponse = await recordingApi.getAnalysisStatus(response.analysisId);
            if (statusResponse.status === 'completed' && statusResponse.result) {
              updateState({ 
                mode: 'results',
                analysisResult: statusResponse.result,
                loading: false 
              });
            } else {
              setTimeout(pollAnalysis, 2000); // Check every 2 seconds
            }
          } catch (error) {
            updateState({
              error: error instanceof Error ? error.message : 'Analysis failed',
              loading: false,
              mode: 'results'
            });
          }
        };
        
        setTimeout(pollAnalysis, 2000);
      }

    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to start analysis',
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
      sessionName: '',
      sessionId: undefined,
      actions: [],
      analysisResult: undefined,
      error: undefined,
      loading: false
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
  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
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
          <div className="space-y-8">
            {/* Error Display */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {state.error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Setup Mode */}
            {state.mode === 'setup' && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Website to Test
                  </h2>                  <URLInput
                    url={state.url}
                    onUrlChange={handleUrlChange}
                    onNavigate={handleNavigateAndRecord}
                    isLoading={state.loading}
                  />
                  <div className="mt-4">
                    <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700">
                      Session Name (optional)
                    </label>
                    <input
                      type="text"
                      id="sessionName"
                      value={state.sessionName}
                      onChange={(e) => handleSessionNameChange(e.target.value)}
                      placeholder="Enter a name for this test session"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </>
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
                    <h2 className="text-lg font-medium text-gray-900 mb-4">                      Recorded Actions ({state.actions.length})
                    </h2>
                    <ActionList 
                      actions={state.actions} 
                      isRecording={state.mode === 'recording'} 
                    />
                  </div>
                )}
              </>
            )}

            {/* Analyzing Mode */}
            {state.mode === 'analyzing' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Analyzing Accessibility
                </h2>                <ProgressIndicator
                  progress={50}
                  title="Analyzing"
                  message="Analyzing accessibility issues..."
                  isVisible={true}
                />
                <div className="mt-4 text-sm text-gray-600">
                  Analyzing {state.actions.length} recorded actions for accessibility issues.
                </div>
              </div>
            )}

            {/* Results Mode */}
            {state.mode === 'results' && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Session Complete
                  </h2>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Recorded {state.actions.length} actions
                      {state.sessionId && (
                        <span className="ml-2">• Session ID: {state.sessionId}</span>
                      )}
                    </div>
                    <div className="space-x-3">
                      {!state.analysisResult && state.actions.length > 0 && (
                        <button
                          onClick={handleStartAnalysis}
                          disabled={state.loading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {state.loading ? 'Analyzing...' : 'Start Analysis'}
                        </button>
                      )}
                      <button
                        onClick={handleReset}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Start New Test
                      </button>
                    </div>
                  </div>
                </div>                {/* Actions List */}
                {state.actions.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Recorded Actions ({state.actions.length})
                    </h2>
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
                    />
                  </div>
                )}
              </>
            )}            {/* Global Progress Indicator */}
            <ProgressIndicator
              progress={state.loading ? 50 : 0}
              title={
                state.mode === 'recording' 
                  ? 'Recording' 
                  : state.mode === 'analyzing'
                    ? 'Analyzing'
                    : 'Ready'
              }
              message={
                state.mode === 'recording' 
                  ? 'Recording user actions...' 
                  : state.mode === 'analyzing'
                    ? 'Analyzing accessibility...'
                    : 'Ready'
              }
              isVisible={state.loading}
            />
          </div>
        </main>

        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center text-sm text-gray-500">
              <p>Web Access Advisor v2.0 - AI-Powered Accessibility Testing</p>
              <p className="mt-1">
                Status: <span className="font-medium capitalize">{state.mode}</span>
                {state.actions.length > 0 && (
                  <span className="ml-4">
                    Actions: <span className="font-medium">{state.actions.length}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </QueryProvider>
  );
}

export default App;
