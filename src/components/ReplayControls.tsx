/**
 * Controls for replaying recorded actions and capturing snapshots
 */

import { useState } from 'react';

const ReplayControls = ({ 
  hasActions, 
  onStartReplay, 
  isReplaying, 
  replayProgress,
  hasSnapshots 
}) => {
  const [replayOptions, setReplayOptions] = useState({
    captureScreenshots: true,
    waitForStability: true,
    analyzeWithGemini: true
  });

  const handleStartReplay = () => {
    onStartReplay(replayOptions);
  };

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
            onClick={handleStartReplay}
            disabled={!canReplay}
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
