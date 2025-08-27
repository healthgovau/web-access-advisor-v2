/**
 * Saved session selector for loading previously recorded sessions
 */

import { useState, useEffect, useRef } from 'react';

interface SavedSession {
  sessionId: string;
  sessionName: string;
  url: string;
  startTime: string;
  actionCount: number;
  created: string;
  recordingContext?: {
    useProfile: boolean;
    browserType?: string;
    browserName?: string;
    authenticationNote?: string;
  };
}

interface SessionSelectorProps {
  onSessionSelect: (sessionId: string) => void;
  isLoading?: boolean;
}

const SessionSelector: React.FC<SessionSelectorProps> = ({ onSessionSelect, isLoading = false }) => {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string>('');  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch saved sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      setLoadingSessions(true);
      setError('');
      
      try {
        const response = await fetch('http://localhost:3002/api/recordings');
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.statusText}`);
        }
        
        const sessionData = await response.json();
        setSessions(sessionData);
      } catch (err) {
        console.error('Failed to fetch saved sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, []);

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = e.target.value;
    setSelectedSessionId(sessionId);
    
    // Auto-load session when one is selected
    if (sessionId && !isLoading) {
      // Wait for UI to fully render before scrolling
      setTimeout(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const scrollTop = window.pageYOffset + rect.top;
          window.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }, 200); // 200ms delay to allow UI to update
      
      onSessionSelect(sessionId);
    }
  };

  if (loadingSessions) {
    return (
      <div ref={containerRef} className="card rounded-lg p-4">
        <h3 className="text-xl font-medium text-brand-dark mb-3 text-center">Load Saved Session</h3>
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading saved sessions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className="card rounded-lg p-4">
        <h3 className="text-xl font-medium text-brand-dark mb-3 text-center">Load Saved Session</h3>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700 text-sm">
            <strong>Error loading sessions:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div ref={containerRef} className="card rounded-lg p-4">
        <h3 className="text-xl font-medium text-brand-dark mb-3 text-center">Load Saved Session</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No saved sessions found</div>
          <div className="text-sm text-gray-400">
            Record some sessions first to see them here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="card rounded-lg p-4">
      <h3 className="text-xl font-medium text-brand-dark mb-3 text-center">Load Saved Session</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="session-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select a recorded session to analyze:
          </label>
          
          <select
            id="session-select"
            value={selectedSessionId}
            onChange={handleSessionChange}
            className="input-primary w-full"
            disabled={isLoading}
          >
            <option value="">Choose a session...</option>
            {sessions.map((session) => (
              <option key={session.sessionId} value={session.sessionId}>
                {session.sessionName} ({session.actionCount} actions) - {session.url} - {session.sessionId}
              </option>
            ))}
          </select>
        </div>

        {selectedSessionId && (() => {
          const selectedSession = sessions.find(s => s.sessionId === selectedSessionId);
          const context = selectedSession?.recordingContext;
          
          if (!context) return null;
          
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-medium text-amber-800">
                  🎬 Playback Preparation
                </h4>
                {/* Info icon with popover */}
                <div className="relative group">
                  <button
                    type="button"
                    aria-label="Show playback preparation information"
                    className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4 text-amber-600 hover:text-amber-800 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {/* Popover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="space-y-3 text-sm text-left">
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Why prepare for playback?</div>
                        <div className="text-gray-700">The Web Access Advisor replays your exact interactions. If your session included authenticated content, you need to be logged in for accurate replay.</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">Preparation steps:</div>
                        <div className="text-gray-700">1. Open your website in a separate tab<br/>2. Log in normally<br/>3. Return here and click 'Analyze Recording'</div>
                      </div>
                    </div>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200"></div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-amber-700 space-y-2">
                <div>
                  <span className="font-medium">Original Recording:</span> {context.authenticationNote}
                </div>
                <div className="bg-amber-100 border border-amber-300 rounded p-2 text-xs">
                  {context.useProfile 
                    ? "⚠️ This recording used your saved logins. Please make sure you're signed in to the website before analyzing."
                    : "✅ This recording was made without saved logins. You can analyze immediately - no sign-in required."
                  }
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SessionSelector;
