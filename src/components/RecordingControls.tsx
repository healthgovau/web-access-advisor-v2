/**
 * Recording controls for starting/stopping interaction recording
 */

import { useState } from 'react';

const RecordingControls = ({ 
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  hasActions,
  isNavigated 
}) => {
  const [recordingName, setRecordingName] = useState('');

  const handleStartRecording = () => {
    const name = recordingName.trim() || `Recording ${new Date().toLocaleString()}`;
    onStartRecording(name);
  };

  const canStartRecording = isNavigated && !isRecording && recordingName.trim();
  const canStopRecording = isRecording;

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Recording Controls</h3>
        
        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">Recording...</span>
          </div>
        )}
      </div>

      {!isRecording && (
        <div className="space-y-3">
          <div>
            <label htmlFor="recording-name" className="block text-sm font-medium text-gray-700 mb-1">
              Recording Name
            </label>
            <input
              id="recording-name"
              type="text"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
              placeholder="Enter a name for this recording..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={handleStartRecording}
            disabled={!canStartRecording}
            className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!isNavigated ? 'Navigate to a URL first' : 'Start Recording'}
          </button>
        </div>
      )}

      {isRecording && (
        <button
          onClick={onStopRecording}
          className="w-full px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Stop Recording
        </button>
      )}

      {!isNavigated && (
        <p className="text-sm text-gray-500">
          Enter a URL and navigate to the page before starting recording.
        </p>
      )}
    </div>
  );
};

export default RecordingControls;
