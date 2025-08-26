/**
 * Main App component for Web Access Advisor
 * Accessibility testing tool with recording/replay functionality
 */

import { useState, useEffect, useRef } from 'react';
import { QueryProvider } from './services/queryClient';
import URLInput from './components/URLInput';
import ConfirmModal from './components/ConfirmModal';
import BrowserSelection from './components/BrowserSelection';
import ActionList from './components/ActionList';
import ThreePhaseStatus from './components/ThreePhaseStatus';
import AnalysisResults from './components/AnalysisResults';
import AnalysisControls from './components/AnalysisControls';
import ErrorDisplay from './components/ErrorDisplay';
import SessionModeToggle from './components/SessionModeToggle';
import SessionSelector from './components/SessionSelector';
import { AuthenticationDetourPanel } from './components/AuthenticationDetourPanel';
import { useAccessibilityAnalysis } from './hooks/useAccessibilityAnalysis';
import { exportAnalysisToPDF } from './utils/pdfExport';
import { exportAnalysisToCSV } from './utils/csvExport';
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
            Important things to know and do
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
                    Run the analysis several times, especially for dynamic content. LLM analysis can vary between runs.
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
    className={`mb-4 ml-4 px-4 py-3 rounded shadow-lg flex items-start min-w-xs max-w-2xl ${type === 'error' ? 'bg-red-700' : 'bg-blue-700'} text-white animate-fade-in`}
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
  
  // Static section filtering state
  const [staticSectionMode, setStaticSectionMode] = useState<'include' | 'ignore' | 'separate'>('separate');

  // Browser selection state
  const [selectedBrowser, setSelectedBrowser] = useState<string>(''); // No default selection
  const [selectedBrowserType, setSelectedBrowserType] = useState<'chromium' | 'firefox' | 'webkit'>('chromium');
  const [useProfile, setUseProfile] = useState<boolean>(false);
  
  // Store "New Recording" browser selection separately to persist across mode switches
  const [newRecordingBrowser, setNewRecordingBrowser] = useState<string>('');
  const [newRecordingBrowserType, setNewRecordingBrowserType] = useState<'chromium' | 'firefox' | 'webkit'>('chromium');
  const [newRecordingUseProfile, setNewRecordingUseProfile] = useState<boolean>(false);

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
  // Browser selection ref for auto-scrolling
  const browserSelectionRef = useRef<HTMLDivElement | null>(null);
  // PDF export state
  const [isExporting, setIsExporting] = useState(false);
  // Info modal state
  const [infoOpen, setInfoOpen] = useState(false);
  // Confirm modal state (used for profile-locked choice)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmResolveRef = useRef<(value: boolean) => void | null>(null);
  
  // Authentication detour state - manual control over detour browser
  const [authDetourVisible, setAuthDetourVisible] = useState(false);
  const [authDetourResolve, setAuthDetourResolve] = useState<((success: boolean) => void) | null>(null);
  
  // Toast state for error notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'error' | 'info' }[]>([]);
  
  // Track if component is mounted to prevent state updates on unmounted component
  const isMountedRef = useRef(true);
  
  // Track last progress message to prevent duplicates
  const lastProgressMessageRef = useRef<string>('');

  // Reset mount ref to true when component renders (handles React strict mode)
  useEffect(() => {
    isMountedRef.current = true;
  });

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

  // CSV Export handler
  const handleExportCSV = async () => {
    if (!state.analysisResult) return;

    setIsExporting(true);
    try {
      await exportAnalysisToCSV(state.analysisResult);
      addToast('CSV export completed successfully', 'info');
    } catch (error) {
      console.error('CSV export failed:', error);
      addToast('Failed to export CSV', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Update state helper with mounted check
  const updateState = (updates: Partial<AppState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    } else {
      console.warn('Attempted to update state on unmounted component:', updates);
    }
  };
  // Handle URL changes
  const handleUrlChange = (url: string) => {
    updateState({ url });
  };

  // Browser selection handlers
  const handleBrowserChange = (browserType: 'chromium' | 'firefox' | 'webkit', browserName: string) => {
    setSelectedBrowserType(browserType);
    setSelectedBrowser(browserName);
    
    // Also update the stored "New Recording" values when in new recording mode
    if (sessionMode === 'new') {
      setNewRecordingBrowserType(browserType);
      setNewRecordingBrowser(browserName);
    }
    
    // Auto-scroll browser options to top of viewport on first interaction
    if (!selectedBrowser && browserSelectionRef.current) {
      setTimeout(() => {
        browserSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
      }, 100); // Small delay to ensure DOM updates
    }
  };

  const handleProfileToggle = (useProfileValue: boolean) => {
    setUseProfile(useProfileValue);
    
    // Also update the stored "New Recording" value when in new recording mode
    if (sessionMode === 'new') {
      setNewRecordingUseProfile(useProfileValue);
    }
    
    // Auto-scroll browser options to top of viewport on first interaction
    if (!selectedBrowser && browserSelectionRef.current) {
      setTimeout(() => {
        browserSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
      }, 100); // Small delay to ensure DOM updates
    }
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
      updateState({ loading: true, error: undefined });
      if (!isMountedRef.current) return; // Check after state update
      
      updateProgress('starting-browser', 'Initializing browser environment', 10);
      if (!isMountedRef.current) return; // Check after progress update

      if (!state.url.trim()) {
        throw new Error('Please enter a URL to test');
      }

      updateProgress('starting-browser', 'Launching browser session');
      if (!isMountedRef.current) return; // Check before API call

      // AUTHENTICATION FLOW: storageState → profile → interactive detour
      let provisionalId: string | undefined = undefined;
      let authenticationState: 'storageState' | 'profile' | 'detour' | 'none' = 'none';
      
      // Step 1: Check for existing storageState from previous sessions
      updateProgress('starting-browser', 'Checking for saved authentication state');
      try {
        console.log('🔍 Searching for sessions with storageState for URL:', state.url);
        const sessionsWithStorage = await recordingApi.findSessionsWithStorageState(state.url);
        console.log(`Found ${sessionsWithStorage.length} sessions with potential storageState for ${state.url}:`, sessionsWithStorage);
        
        // Try to validate the most recent storageState
        for (const session of sessionsWithStorage) {
          try {
            updateProgress('starting-browser', `Validating saved authentication from ${new Date(session.lastModified).toLocaleDateString()}`);
            console.log(`🔬 Validating storageState for session ${session.sessionId}`);
            const validation = await recordingApi.validateStorageState(session.sessionId, {
              probeUrl: state.url,
              timeoutMs: 10000
            });
            console.log(`Validation result for ${session.sessionId}:`, validation);
            
            if (validation.ok) {
              console.log(`✅ Valid storageState found in session ${session.sessionId}`);
              provisionalId = session.sessionId;
              authenticationState = 'storageState';
              break;
            } else {
              console.log(`❌ Invalid storageState in session ${session.sessionId}: ${validation.reason}`);
            }
          } catch (err) {
            console.warn(`Failed to validate storageState for ${session.sessionId}:`, err);
            continue;
          }
        }
      } catch (err) {
        console.error('Failed to search for sessions with storageState:', err);
        // Show the error to the user instead of silently continuing
        updateProgress('starting-browser', `Error checking saved authentication: ${err instanceof Error ? err.message : String(err)}`);
        // Wait a moment so user can see the error
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 2: If no valid storageState found, check browser profile (only if profile sharing enabled)
      if (authenticationState === 'none' && useProfile) {
        updateProgress('starting-browser', 'Checking browser profile availability');
        try {
          const probe = await recordingApi.profileProbe({ browserType: selectedBrowserType, browserName: selectedBrowser });
          console.log(`Profile probe result: ${probe.status}`);
          
          if (probe.status === 'usable') {
            // Profile is available - but we need to check if it has auth for this specific domain
            updateProgress('starting-browser', 'Checking domain authentication in browser profile');
            try {
              const domainCheck = await recordingApi.checkDomainLogin(state.url);
              console.log('Domain authentication check:', domainCheck);
              
              const browserLoginStatus = domainCheck.loginStatus[selectedBrowser] || false;
              if (browserLoginStatus) {
                authenticationState = 'profile';
                console.log(`✅ Browser profile has authentication for ${domainCheck.domain}`);
              } else {
                authenticationState = 'detour';
                console.log(`❌ Browser profile lacks authentication for ${domainCheck.domain} - will run detour`);
              }
            } catch (domainCheckErr) {
              console.warn('Domain check failed, assuming profile needs detour:', domainCheckErr);
              authenticationState = 'detour';
            }
          } else if (probe.status === 'locked') {
            // Show confirm modal to let user choose close browser (confirm) or run interactive detour (cancel)
            const choice = await new Promise<boolean>((resolve) => {
              confirmResolveRef.current = resolve;
              setConfirmOpen(true);
            });

            setConfirmOpen(false);
            confirmResolveRef.current = null;

            if (!choice) {
              // user chose to run detour (Cancel)
              authenticationState = 'detour';
            } else {
              // user chose to close browser - throw to surface UI state so user can retry
              throw new Error('Please close your browser to allow profile access and try again');
            }
          } else {
            // no_profile or error - will need detour
            authenticationState = 'detour';
            console.log(`❌ Profile not available: ${probe.status} - ${probe.message}`);
          }
        } catch (err) {
          console.warn('Profile probe error, will run interactive detour:', err);
          authenticationState = 'detour';
        }
      } else if (authenticationState === 'none' && !useProfile) {
        // No storageState found and profile sharing disabled - need detour
        authenticationState = 'detour';
      }

      // Step 3: Run interactive detour if needed
      if (authenticationState === 'detour') {
        updateProgress('starting-browser', 'Opening browser for authentication - sign in and click Continue');
        try {
          // Start manual detour - opens browser but waits for user confirmation
          const detourResult = await recordingApi.startAuthDetour({ 
            browserType: selectedBrowserType, 
            browserName: selectedBrowser, 
            probeUrl: state.url
          });

          // Show floating authentication panel and wait for user action
          const authSuccess = await new Promise<boolean>((resolve) => {
            setAuthDetourResolve(() => resolve);
            setAuthDetourVisible(true);
          });

          // Hide panel
          setAuthDetourVisible(false);
          setAuthDetourResolve(null);

          if (authSuccess) {
            // User clicked "Continue Recording" - complete the detour
            const completionResult = await recordingApi.completeAuthDetour(detourResult.detourId);
            
            if (completionResult.ok) {
              if (completionResult.provisionalId) {
                provisionalId = completionResult.provisionalId;
                console.log(`✅ Manual detour completed with saved storageState: ${provisionalId}`);
              } else {
                console.log('✅ Manual detour completed but storageState could not be saved - will use profile/clean browser');
              }
              authenticationState = 'detour';
            } else {
              throw new Error(`Authentication validation failed: ${completionResult.reason || 'unknown'}`);
            }
          } else {
            // User clicked "Cancel" - cancel the detour
            await recordingApi.cancelAuthDetour(detourResult.detourId);
            throw new Error('Authentication cancelled by user');
          }
        } catch (err) {
          console.error('Interactive detour failed:', err);
          throw new Error(`Authentication detour failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      console.log(`🔐 Authentication flow completed using: ${authenticationState}${provisionalId ? ` (session: ${provisionalId})` : ''}`);
      updateProgress('starting-browser', `Authentication ready${authenticationState === 'storageState' ? ' (using saved state)' : authenticationState === 'profile' ? ' (using browser profile)' : ' (interactive login completed)'}`);

      // Start recording session. If we have a provisionalId from storageState or detour, pass it so recording uses saved authentication
      const response = await recordingApi.startRecordingSession({
        url: state.url,
        browserType: selectedBrowserType,
        browserName: selectedBrowser,
        useProfile: useProfile,
        name: `Recording ${new Date().toLocaleString()}`,
        precreatedSessionId: provisionalId
      } as any);
      
      if (!isMountedRef.current) return; // Check after async operation

      updateProgress('recording', 'Browser ready - interact with the website to record actions');

      updateState({
        mode: 'recording',
        sessionId: response.sessionId,
        actions: [],
        loading: false
      });

      // Start polling for actions
      if (isMountedRef.current) {
        startActionPolling(response.sessionId);
      }
    } catch (error) {
      if (!isMountedRef.current) return; // Don't update if unmounted
      
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
        mode: 'ready',
        loading: false
      });

      // Scroll to browser options to show analysis context
      setTimeout(() => {
        browserSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);

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
    if (!state.sessionId) return;

    try {
      // Reset progress message tracking for new analysis
      lastProgressMessageRef.current = '';
      
      updateState({
        mode: 'analyzing',
        loading: true,
        error: undefined
      });

      updateProgress('preparing-analysis', 'Initializing accessibility analysis');

      if (state.actions.length === 0) {
        throw new Error('No actions to analyze');
      }

      updateProgress('replaying-actions', 'Replaying actions in headless browser');

      // Brief delay to show the replaying phase
      await new Promise(resolve => setTimeout(resolve, 800));

      updateProgress('capturing-snapshots', 'Capturing accessibility snapshots');
      // Start the analysis
      const response = await recordingApi.analyzeSession(state.sessionId, { staticSectionMode });        if (response.status === 'completed' && response.result) {
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
        let pollRetryCount = 0;
        const maxRetries = 3;
        const pollAnalysis = async () => {
          try {
            const statusResponse = await recordingApi.getAnalysisStatus(response.analysisId);

            // Reset retry count on successful response
            pollRetryCount = 0;

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

              // Update progress with real-time snapshot count and batch info
              updateProgress(
                frontendStage, 
                statusResponse.message, 
                undefined, 
                undefined, 
                undefined, 
                statusResponse.snapshotCount,
                statusResponse.batchCurrent,
                statusResponse.batchTotal
              );
            }

            if (statusResponse.status === 'completed' && statusResponse.result) {
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
              // Analysis actually failed on backend
              updateProgress('error', statusResponse.message || 'Analysis failed');
              updateState({
                error: statusResponse.message || 'Analysis failed',
                loading: false,
                mode: 'results'
              });
              return; // Stop polling
            }

            // Analysis still in progress - continue polling
            setTimeout(() => {
              pollAnalysis().catch(err => {
                console.error('Unhandled polling error in setTimeout:', err);
                // Don't crash the app, just log the error
              });
            }, 2000);
          } catch (error) {
            console.error(`Analysis polling error (attempt ${pollRetryCount + 1}/${maxRetries + 1}):`, error);
            
            pollRetryCount++;
            
            if (pollRetryCount <= maxRetries) {
              // Retry with exponential backoff
              const retryDelay = Math.min(2000 * Math.pow(2, pollRetryCount - 1), 10000);
              
              // Show temporary warning message for polling issues (not a fatal error)
              updateProgress('processing-with-ai', 
                `Connection issue detected (retry ${pollRetryCount}/${maxRetries}). Retrying in ${Math.ceil(retryDelay/1000)}s...`, 
                undefined, 
                'The analysis is likely still running on the server.');
              
              setTimeout(() => {
                pollAnalysis().catch(err => {
                  console.error('Unhandled polling retry error in setTimeout:', err);
                  // Don't crash the app, just log the error
                });
              }, retryDelay);
              return;
            }

            // Max retries exceeded - but DON'T treat this as a fatal error
            // Instead, provide a way to manually retry or check status
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            let userFriendlyMessage = 'Polling connection lost';
            let details = 'The backend analysis may still be running. You can try refreshing the page or waiting a few minutes.';
            
            if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
              userFriendlyMessage = 'Network connection lost';
              details = 'Check your internet connection. The analysis may still be running on the server.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
              userFriendlyMessage = 'Server response timeout';
              details = 'The server is taking longer than expected. The analysis may still be processing.';
            } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
              userFriendlyMessage = 'Analysis session not found';
              details = 'The analysis session may have expired or been cleaned up.';
            } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
              userFriendlyMessage = 'Server error occurred';
              details = 'There was an internal server error. Please try starting a new analysis.';
            }

            // Show warning in progress but DON'T set state.error (which triggers toast)
            updateProgress('processing-with-ai', 
              `${userFriendlyMessage}`, 
              undefined, 
              `${details} | Technical details: ${errorMessage}`);
            
            // Show a less intrusive toast warning instead of fatal error
            addToast(`${userFriendlyMessage}: ${details}`, 'info');
            
            // Show warning in progress and continue analysis without setting fatal error
            updateState({
              loading: false  // Stop the loading spinner, but keep analysis mode
            });
          }
        };

        // Start polling immediately
        setTimeout(() => {
          pollAnalysis().catch(err => {
            console.error('Unhandled initial polling error in setTimeout:', err);
            // Don't crash the app, just log the error
          });
        }, 1000);
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
    lastProgressMessageRef.current = ''; // Reset progress message tracking
    setSessionMode('new'); // Reset to new recording mode
    
    // Reset browser selection to force re-selection
    setSelectedBrowser('');
    setSelectedBrowserType('chromium');
    setUseProfile(true);
    
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
    
    // Scroll to top when starting new session
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle session mode change
  const handleSessionModeChange = (mode: 'new' | 'load') => {
    const previousMode = sessionMode;
    
    if (previousMode === 'new' && mode === 'load') {
      // Save current "New Recording" selection before switching
      setNewRecordingBrowser(selectedBrowser);
      setNewRecordingBrowserType(selectedBrowserType);
      setNewRecordingUseProfile(useProfile);
      
      // Clear current selection for "Load Session" mode (will be populated from session)
      setSelectedBrowser('');
      setSelectedBrowserType('chromium');
      setUseProfile(true);
      
      // Auto-scroll to browser selection section for Load Session mode
      setTimeout(() => {
        browserSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    } else if (previousMode === 'load' && mode === 'new') {
      // Restore "New Recording" selection
      setSelectedBrowser(newRecordingBrowser);
      setSelectedBrowserType(newRecordingBrowserType);
      setUseProfile(newRecordingUseProfile);
      
      // Auto-scroll to browser selection section for New Recording mode
      setTimeout(() => {
        browserSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
    
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

      // Extract browser metadata from saved session
      const { browserType, browserName, useProfile } = sessionData;
      
      if (browserType) {
        // Auto-populate browser selection from saved session
        console.log(`🔄 Auto-populating browser selection from saved session:`);
        console.log(`   - Browser Type: ${browserType}`);
        console.log(`   - Browser Name: ${browserName}`);
        console.log(`   - Use Profile: ${useProfile ? 'Yes' : 'No'}`);
        
        // Use stored browserName if available, otherwise fallback to mapping
        const displayName = browserName || (() => {
          const browserNameMap: { [key: string]: string } = {
            'chromium': 'Google Chrome',
            'firefox': 'Mozilla Firefox', 
            'webkit': 'Safari'
          };
          return browserNameMap[browserType] || 'Chrome';
        })();
        
        // Apply browser settings from saved session
        setSelectedBrowser(displayName);
        setSelectedBrowserType(browserType as 'chromium' | 'firefox' | 'webkit');
        setUseProfile(useProfile ?? true);
        
        updateProgress('preparing-analysis', `Loaded session settings: ${displayName}${useProfile ? ' with profile' : ''}`);
      } else {
        // Fallback for sessions without browser metadata
        console.log(`⚠️ No browser metadata found in saved session - using default settings`);
        updateProgress('preparing-analysis', 'Session loaded (no browser settings found)');
      }

      updateProgress('recording-complete', `Session loaded: ${sessionData.actionCount} actions`, undefined, 'Ready for accessibility analysis');

      updateState({
        mode: 'ready',
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

      // Auto-scroll to browser details after session loading
      setTimeout(() => {
        browserSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);

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
      isMountedRef.current = false;
      stopActionPolling();
    };
  }, []);  // Update progress helper with mounted check and duplicate message prevention
  const updateProgress = (stage: ProgressStage, message: string, progress?: number, details?: string, error?: string, snapshotCount?: number, batchCurrent?: number, batchTotal?: number) => {
    if (!isMountedRef.current) {
      console.warn('Attempted to update progress on unmounted component:', { stage, message });
      return;
    }
    
    // Create a unique message identifier to prevent duplicates
    const messageId = `${stage}:${message}:${progress || 0}:${snapshotCount || 0}:${batchCurrent || 0}:${batchTotal || 0}`;
    
    // Check if this is the same message as the last one (prevents duplicate console logs too)
    if (lastProgressMessageRef.current === messageId) {
      console.log(`📊 Duplicate progress message prevented: ${message}`);
      return;
    }
    
    // Update the last message reference
    lastProgressMessageRef.current = messageId;
    
    setState(prev => ({
      ...prev,
      progress: { stage, message, progress, details, error, snapshotCount, batchCurrent, batchTotal }
    }));
    
    console.log(`📊 Progress: ${stage} - ${message}${progress ? ` (${progress}%)` : ''}${snapshotCount !== undefined ? ` [${snapshotCount} snapshots]` : ''}${batchCurrent && batchTotal ? ` [batch ${batchCurrent}/${batchTotal}]` : ''}`);
  };

  // Helper to add a toast with mounted check
  const addToast = (message: string, type: 'error' | 'info' = 'error') => {
    if (isMountedRef.current) {
      setToasts((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, message, type },
      ]);
    } else {
      console.warn('Attempted to add toast on unmounted component:', message);
    }
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
        <div className="fixed bottom-0 left-0 z-50 flex flex-col items-start pointer-events-auto">
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
                AI-powered accessibility testing and advice
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-base text-slate">
                Service Mode: <span className="font-medium capitalize">{state.mode}</span>
              </div>
              {/* Info button - Always visible */}
              <InfoIcon onClick={() => setInfoOpen(true)} />
            </div>
          </div>
        </header>        <main className="mt-8">
          <div className="space-y-6">

            {/* Three-Phase Status - Always visible at top */}
            <ThreePhaseStatus
              currentStage={state.progress.stage}
              error={state.progress.error}
              actionCount={state.actions.length}
              snapshotCount={(() => {
                const snapshotCount = state.progress.snapshotCount || state.analysisResult?.snapshotCount || 0;
                return snapshotCount;
              })()}
              batchCurrent={state.progress.batchCurrent}
              batchTotal={state.progress.batchTotal}
              warnings={state.analysisResult?.warnings || []}
            />

          {/* Session Mode & Browser Selection - Visible during setup and after recording completion */}
            {(state.mode === 'setup' || state.mode === 'ready') && (
              // Interactive during setup, read-only display when session loaded or recording completed
              <>
                {/* Session Mode Toggle - visible while in setup or ready state so it's available on the Load Session page */}
                <SessionModeToggle
                  mode={sessionMode}
                  onModeChange={handleSessionModeChange}
                  disabled={state.loading}
                />

                {/* Browser Selection - Shows populated settings from loaded session */}
                {(sessionMode === 'new' || (sessionMode === 'load' && selectedBrowser)) && (
                  <BrowserSelection
                    ref={browserSelectionRef}
                    url={state.url}
                    selectedBrowser={selectedBrowser}
                    useProfile={useProfile}
                    onBrowserChange={handleBrowserChange}
                    onProfileToggle={handleProfileToggle}
                    disabled={state.loading || state.mode === 'ready'}
                    sessionMode={sessionMode}
                  />
                )}

                {/* Show URL input/session selector based on mode */}
                {state.mode === 'setup' && (
                  sessionMode === 'new' ? (
                    // New Recording: Only show URL input after browser is selected
                    selectedBrowser && (
                      <URLInput
                        url={state.url}
                        onUrlChange={handleUrlChange}
                        onNavigate={handleNavigateAndRecord}
                        isLoading={state.loading}
                      />
                    )
                  ) : (
                    // Load Session: Always show session selector (browser comes from session)
                    <SessionSelector
                      onSessionSelect={handleLoadSession}
                      isLoading={state.loading}
                    />
                  )
                )}
              </>
            )}            {/* Error Display */}
            {state.error && <ErrorDisplay error={state.error} />}

            {/* Recording Mode */}
            {state.mode === 'recording' && (
              <>
                {/* Session Info - Show during recording when session exists */}
                {state.sessionId && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-card p-4">
                    <div className="flex items-center justify-center flex-wrap gap-3">
                      <div className="flex items-center space-x-3 flex-wrap justify-center">
                        <span className="text-sm font-bold text-gray-700">Session:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${sessionMode === 'new'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {sessionMode === 'new' ? 'New Recording' : 'Loaded Session'}
                        </span>                      {state.sessionId && (
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
                )}

                <div className="bg-white border border-gray-200 rounded-lg shadow-card p-6">
                  <div className="flex items-center justify-between ml-4 mr-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Recording Session
                    </h2>
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Stop Recording</span>
                    </button>
                  </div>
                </div>

                {/* Actions List */}
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
                {/* Session Info - Show during analysis */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-card p-4">
                  <div className="flex items-center justify-center flex-wrap gap-3">
                    <div className="flex items-center space-x-3 flex-wrap justify-center">
                      <span className="text-sm font-bold text-gray-700">Session:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${sessionMode === 'new'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {sessionMode === 'new' ? 'New Recording' : 'Loaded Session'}
                      </span>                    {state.sessionId && (
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

                {/* Actions List - Keep visible during analysis for consistency */}
                {state.actions.length > 0 && (
                  <ActionList
                    actions={state.actions}
                    isRecording={false}
                    sessionId={state.sessionId}
                  />
                )}

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
                </div>
              </>
            )}

            {/* Ready/Results Mode */}            {(state.mode === 'ready' || state.mode === 'results') && (
              <>
                {/* Session Info - Show when ready for analysis or when analysis is complete */}
                {(state.mode === 'ready' || (state.mode === 'results' && state.analysisResult)) && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-card p-4">
                    <div className="flex items-center justify-center flex-wrap gap-3">
                      <div className="flex items-center space-x-3 flex-wrap justify-center">
                        <span className="text-sm font-bold text-gray-700">Session:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${sessionMode === 'new'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {sessionMode === 'new' ? 'New Recording' : 'Loaded Session'}
                        </span>                      {state.sessionId && (
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
                )}

                {/* Ready Bar - Show only when results are displayed */}
                {state.mode === 'results' && state.analysisResult && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-card p-6">
                    <div className="flex items-center justify-between ml-4 mr-4">
                      <div className="text-left">
                        <h2 className="text-lg font-medium text-gray-900">
                          Ready
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          View results below or start a new test.
                        </p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        <span className="text-sm font-medium">Start New Test</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions List */}
                {state.actions.length > 0 && (
                  <ActionList
                    actions={state.actions}
                    isRecording={false}
                    sessionId={state.sessionId}
                  />
                )}

                {/* Analysis Controls - Only show in ready mode, not when results are displayed */}
                {state.mode === 'ready' && (
                  <AnalysisControls
                    hasActions={state.actions.length > 0}
                    hasAnalysisResult={!!state.analysisResult}
                    isLoading={state.loading}
                    staticSectionMode={staticSectionMode}
                    onStaticSectionModeChange={setStaticSectionMode}
                    onStartAnalysis={handleStartAnalysis}
                    onReset={handleReset}
                  />
                )}

                {/* Analysis Results */}
                {state.analysisResult && (
                  <div className="card rounded-lg overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="flex-1"></div>
                        <h2 className="text-xl font-medium text-gray-900 text-center">
                          Accessibility Analysis Results
                        </h2>
                        <div className="flex-1 flex items-center justify-end space-x-3">
                          <button
                            onClick={handleExportCSV}
                            disabled={isExporting}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm font-medium whitespace-nowrap">
                              {isExporting ? 'Generating CSV...' : 'Export CSV'}
                            </span>
                          </button>
                          <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
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
        {/* Confirm Modal for profile-locked choice */}
        <ConfirmModal
          open={confirmOpen}
          title="Browser profile locked"
          description="Your browser profile appears to be locked by the running browser. Close the browser to use the profile, or sign in now via an interactive detour so the recording can use saved authentication without capturing the sign-in."
          confirmText="I will close the browser"
          cancelText="Sign in now"
          onConfirm={() => {
            if (confirmResolveRef.current) confirmResolveRef.current(true);
            setConfirmOpen(false);
          }}
          onCancel={() => {
            if (confirmResolveRef.current) confirmResolveRef.current(false);
            setConfirmOpen(false);
          }}
        />

        {/* Authentication Detour Panel for manual control */}
        <AuthenticationDetourPanel
          isVisible={authDetourVisible}
          targetUrl={state.url}
          onContinue={() => {
            if (authDetourResolve) authDetourResolve(true);
          }}
          onCancel={() => {
            if (authDetourResolve) authDetourResolve(false);
          }}
        />

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
