/**
 * Analysis controls for starting analysis and resetting
 */

import React from 'react';

interface AnalysisControlsProps {
  hasActions: boolean;
  hasAnalysisResult: boolean;
  isLoading: boolean;
  onStartAnalysis: () => void;
  onReset: () => void;
}

const AnalysisControls: React.FC<AnalysisControlsProps> = ({
  hasActions,
  hasAnalysisResult,
  isLoading,
  onStartAnalysis,
  onReset
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Ready for Analysis
        </h2>
        <div className="space-x-3">
          {!hasAnalysisResult && hasActions && (
            <button
              onClick={onStartAnalysis}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Running Replay & Analysis...' : 'Start Replay & Analysis'}
            </button>
          )}
          <button
            onClick={onReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Start New Test
          </button>        </div>
      </div>
    </div>
  );
};

export default AnalysisControls;
