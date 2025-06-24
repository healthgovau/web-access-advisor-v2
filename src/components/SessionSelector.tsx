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
  };  const handleLoadSession = () => {
    if (selectedSessionId) {
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
      
      onSessionSelect(selectedSessionId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canLoadSession = selectedSessionId && !isLoading && !loadingSessions;
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
                {session.sessionName} - {session.url} ({session.actionCount} actions) - {formatDate(session.created)}
              </option>
            ))}
          </select>
        </div>

        {selectedSessionId && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-sm text-blue-700">
              {sessions.find(s => s.sessionId === selectedSessionId)?.sessionName} will be loaded for analysis
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleLoadSession}
            disabled={!canLoadSession}
            className="btn-primary"
          >
           Load Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionSelector;
