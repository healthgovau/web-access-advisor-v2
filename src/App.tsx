/**
 * Main App component for Web Access Advisor
 * Accessibility testing tool with recording/replay functionality
 */

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './services/queryClient';
import ModeToggle from './components/ModeToggle';
import URLInput from './components/URLInput';
import RecordingControls from './components/RecordingControls';
import ActionList from './components/ActionList';
import ReplayControls from './components/ReplayControls';
import ProgressIndicator from './components/ProgressIndicator';
import AnalysisResults from './components/AnalysisResults';
import type { AppState, UserAction, AnalysisResult } from './types';
import './App.css';

function App() {
  // Main application state
  const [state, setState] = useState<AppState>({
    mode: 'manual',
    currentUrl: '',
    isRecording: false,
    isReplaying: false,
    actions: [],
    snapshots: [],
    analysisResults: null,
    error: null,
    loading: false
  });

  // Update state helper
  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Handle mode change
  const handleModeChange = (mode: AppState['mode']) => {
    updateState({ mode });
  };

  // Handle URL changes
  const handleUrlChange = (url: string) => {
    updateState({ currentUrl: url });
  };

  // Handle navigation
  const handleNavigate = async (url: string) => {
    try {
      updateState({ loading: true, error: null });
      // TODO: Implement navigation logic with Playwright
      console.log(`Navigating to: ${url}`);
      updateState({ currentUrl: url, loading: false });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Navigation failed',
        loading: false 
      });
    }
  };

  // Handle recording start
  const handleStartRecording = async () => {
    try {
      updateState({ loading: true, error: null });
      
      if (!state.currentUrl) {
        throw new Error('Please enter a URL to start recording');
      }

      // Initialize recording with navigation
      const initialAction: UserAction = {
        type: 'navigate',
        url: state.currentUrl,
        timestamp: new Date().toISOString(),
        step: 1
      };

      updateState({ 
        isRecording: true,
        actions: [initialAction],
        loading: false 
      });

      console.log('Recording started');
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to start recording',
        loading: false 
      });
    }
  };

  // Handle recording stop
  const handleStopRecording = () => {
    updateState({ isRecording: false });
    console.log(`Recording stopped. Captured ${state.actions.length} actions`);
  };
  // Handle replay start
  const handleStartReplay = async () => {
    try {
      updateState({ loading: true, error: null, isReplaying: true });
      
      if (state.actions.length === 0) {
        throw new Error('No actions to replay');
      }

      console.log(`Starting replay of ${state.actions.length} actions`);
      
      // TODO: Implement replay logic with Playwright
      // This would call the analysis API
      
      // Simulate analysis for now
      setTimeout(() => {
        const mockResults: AnalysisResult = {
          success: true,
          sessionId: `session_${Date.now()}`,
          snapshotCount: state.actions.length,
          snapshots: [],
          manifest: {
            sessionId: `session_${Date.now()}`,
            url: state.currentUrl,
            timestamp: new Date().toISOString(),
            totalSteps: state.actions.length,
            stepDetails: []
          }
        };
        
        updateState({ 
          isReplaying: false,
          analysisResults: mockResults,
          loading: false 
        });
      }, 3000);

    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to start replay',
        loading: false,
        isReplaying: false 
      });
    }
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        updateState({ error: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return (
    <QueryProvider>
      <Router>
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
                <ModeToggle 
                  mode={state.mode} 
                  onModeChange={handleModeChange}
                />
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={
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

                  {/* URL Input Section */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Website to Test
                    </h2>                    <URLInput
                      url={state.currentUrl}
                      onUrlChange={handleUrlChange}
                      onNavigate={handleNavigate}
                      isLoading={state.loading}
                    />
                  </div>

                  {/* Recording Controls */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Recording Controls
                    </h2>                    <RecordingControls
                      isRecording={state.isRecording}
                      onStartRecording={handleStartRecording}
                      onStopRecording={handleStopRecording}
                      hasActions={state.actions.length > 0}
                      isNavigated={!!state.currentUrl}
                    />
                  </div>

                  {/* Actions List */}
                  {state.actions.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">
                        Recorded Actions ({state.actions.length})
                      </h2>                      <ActionList
                        actions={state.actions}
                        isRecording={state.isRecording}
                      />
                    </div>
                  )}

                  {/* Replay Controls */}
                  {state.actions.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">
                        Analysis & Replay
                      </h2>                      <ReplayControls
                        hasActions={state.actions.length > 0}
                        isReplaying={state.isReplaying}
                        onStartReplay={handleStartReplay}
                        replayProgress={state.isReplaying ? 50 : 0}
                        hasSnapshots={state.snapshots.length > 0}
                      />
                    </div>
                  )}

                  {/* Progress Indicator */}                  <ProgressIndicator
                    progress={state.isReplaying ? 50 : 0}
                    title={state.isReplaying ? 'Analysis' : state.isRecording ? 'Recording' : 'Ready'}
                    message={
                      state.isReplaying 
                        ? 'Analyzing accessibility...' 
                        : state.isRecording 
                          ? 'Recording actions...' 
                          : 'Ready'
                    }
                    isVisible={state.loading || state.isRecording || state.isReplaying}
                  />

                  {/* Analysis Results */}
                  {state.analysisResults && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">
                        Accessibility Analysis Results
                      </h2>                      <AnalysisResults
                        analysisData={state.analysisResults}
                        isLoading={state.loading}
                        error={state.error}
                      />
                    </div>
                  )}
                </div>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="bg-white border-t mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="text-center text-sm text-gray-500">
                <p>Web Access Advisor v2.0 - AI-Powered Accessibility Testing</p>
                <p className="mt-1">
                  Mode: <span className="font-medium">{state.mode}</span>
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
      </Router>
    </QueryProvider>
  );
}

export default App;
