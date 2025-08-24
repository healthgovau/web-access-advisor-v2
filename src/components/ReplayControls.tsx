/**
 * Controls for replaying recorded actions and capturing snapshots
 */

import { useState, useEffect } from 'react';

const ReplayControls = ({ 
  hasActions, 
  onStartReplay, 
  isReplaying, 
  replayProgress,
  hasSnapshots,
  sessionId,
  onRefreshAuth
}) => {
  const [replayOptions, setReplayOptions] = useState({
    captureScreenshots: true,
    waitForStability: true,
    analyzeWithGemini: true
  });

  const [storageStateStatus, setStorageStateStatus] = useState(null);
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [validatingStorage, setValidatingStorage] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const handleStartReplay = () => {
    onStartReplay(replayOptions);
  };

  const checkStorageState = async () => {
    if (!sessionId) return;
    try {
      setCheckingStorage(true);
      const res = await fetch(`/api/sessions/${sessionId}/storage-state/status`);
      const json = await res.json();
      setStorageStateStatus(json.storageState || null);
    } catch (err) {
      setStorageStateStatus(null);
    } finally {
      setCheckingStorage(false);
    }
  };

  const validateStorageState = async () => {
    if (!sessionId) return;
    try {
      setValidatingStorage(true);
      setValidationResult(null);
      const res = await fetch(`/api/sessions/${sessionId}/storage-state/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeoutMs: 10000 }) });
      const json = await res.json();
      setValidationResult(json.validation || null);
      // Refresh status after validation
      await checkStorageState();
    } catch (err) {
      setValidationResult({ ok: false, reason: 'request_failed' });
    } finally {
      setValidatingStorage(false);
    }
  };

  // Check on mount and when sessionId changes
  useEffect(() => {
    if (sessionId) checkStorageState();
  }, [sessionId]);

  const canReplay = hasActions && !isReplaying;

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Replay & Analysis</h3>
        
        {isReplaying && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-600">Replaying...</span>
          </div>
        )}
      </div>

      {!hasActions && (
        <p className="text-sm text-gray-500">
          Record some actions first to enable replay and analysis.
        </p>
      )}

      {hasActions && !isReplaying && (
        <div className="space-y-3">
          {/* Storage state status */}
          {sessionId && (
            <div className="mb-2">
              {checkingStorage && (
                <div className="text-sm text-gray-500">Checking authentication...</div>
              )}

              {!checkingStorage && storageStateStatus && storageStateStatus.present && storageStateStatus.expired === true && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  Storage state expired on {storageStateStatus.earliestExpiry ? new Date(storageStateStatus.earliestExpiry * 1000).toLocaleString() : 'unknown'}. Please re-login to refresh authentication.
                  {onRefreshAuth && (
                    <button onClick={onRefreshAuth} className="ml-3 underline text-sm">Re-login</button>
                  )}
                </div>
              )}

              {!checkingStorage && storageStateStatus && storageStateStatus.present && (
                <div className="mt-2">
                  <button onClick={validateStorageState} disabled={validatingStorage} className="px-2 py-1 bg-white border rounded text-sm">{validatingStorage ? 'Validating...' : 'Validate authentication'}</button>
                  {validationResult && (
                    <span className={`ml-3 text-sm ${validationResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                      {validationResult.ok ? `OK (${validationResult.elapsedMs}ms)` : `Failed: ${validationResult.reason || 'unknown'}`}
                    </span>
                  )}
                </div>
              )}

              {!checkingStorage && storageStateStatus && storageStateStatus.present && storageStateStatus.expired !== true && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                  Storage state present and valid. Replay will use recorded authentication.
                </div>
              )}

              {!checkingStorage && (!storageStateStatus || storageStateStatus.present === false) && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  No storage state found for this session. Replay will run in a clean session unless you refresh authentication.
                  {onRefreshAuth && (
                    <button onClick={onRefreshAuth} className="ml-3 underline text-sm">Re-login</button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Replay Options:</label>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={replayOptions.captureScreenshots}
                  onChange={(e) => setReplayOptions(prev => ({
                    ...prev,
                    captureScreenshots: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Capture screenshots</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={replayOptions.waitForStability}
                  onChange={(e) => setReplayOptions(prev => ({
                    ...prev,
                    waitForStability: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Wait for page stability</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={replayOptions.analyzeWithGemini}
                  onChange={(e) => setReplayOptions(prev => ({
                    ...prev,
                    analyzeWithGemini: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Analyze with Gemini AI</span>
              </label>
            </div>
          </div>
          
          <button
            onClick={() => { checkStorageState(); handleStartReplay(); }}
            disabled={!canReplay || (storageStateStatus && storageStateStatus.present === false)}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze Recording
          </button>
        </div>
      )}

      {isReplaying && replayProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{replayProgress.currentAction}</span>
            <span className="text-gray-500">
              {replayProgress.current} / {replayProgress.total}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(replayProgress.current / replayProgress.total) * 100}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500">{replayProgress.status}</p>
        </div>
      )}

      {hasSnapshots && !isReplaying && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <span className="text-green-500 text-sm">✅</span>
            <span className="ml-2 text-sm text-green-700">
              Snapshots captured successfully. Check the Analysis Results below.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplayControls;
