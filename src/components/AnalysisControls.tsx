/**
 * Analysis controls for starting analysis and resetting
 */

import React from 'react';

interface AnalysisControlsProps {
  hasActions: boolean;
  hasAnalysisResult: boolean;
  isLoading: boolean;
  staticSectionMode: 'include' | 'ignore' | 'separate';
  onStaticSectionModeChange: (mode: 'include' | 'ignore' | 'separate') => void;
  onStartAnalysis: () => void;
  onReset: () => void;
}

const AnalysisControls: React.FC<AnalysisControlsProps> = ({
  hasActions,
  hasAnalysisResult,
  isLoading,
  staticSectionMode,
  onStaticSectionModeChange,
  onStartAnalysis,
  onReset
}) => {
  // Map internal values to display labels
  const getModeLabel = (mode: 'include' | 'ignore' | 'separate'): string => {
    switch (mode) {
      case 'separate': return 'Smart';
      case 'include': return 'All';
      case 'ignore': return 'None';
      default: return 'Smart';
    }
  };

  const getModeValue = (label: string): 'include' | 'ignore' | 'separate' => {
    switch (label) {
      case 'Smart': return 'separate';
      case 'All': return 'include';
      case 'None': return 'ignore';
      default: return 'separate';
    }
  };

  const modes = ['Smart', 'All', 'None'];
  const currentLabel = getModeLabel(staticSectionMode);

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Ready for Analysis
        </h2>
        
        {/* Three-way switch in the center */}
        {!hasAnalysisResult && hasActions && (
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center bg-gray-100 rounded-lg p-1">
              {modes.map((mode, index) => (
                <React.Fragment key={mode}>
                  <button
                    onClick={() => onStaticSectionModeChange(getModeValue(mode))}
                    className={`relative z-10 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                      currentLabel === mode
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    type="button"
                  >
                    {mode}
                  </button>
                  {index < modes.length - 1 && (
                    <div className="w-px h-5 bg-gray-300 mx-1"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
            {/* Info icon with popover */}
            <div className="relative group">
              <button
                type="button"
                aria-label="Show static section analysis mode information"
                className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Popover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="space-y-3 text-sm">
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 mb-1">Smart</div>
                    <div className="text-gray-700">Static nav, footer & header elements are counted once only</div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 mb-1">All</div>
                    <div className="text-gray-700">Static nav, footer & header elements are included in every analysis</div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 mb-1">None</div>
                    <div className="text-gray-700">Static nav, footer & header elements are completely ignored</div>
                  </div>
                </div>
                {/* Arrow pointing down */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200"></div>
              </div>
            </div>
          </div>
        )}

        <div className="space-x-3">
          {!hasAnalysisResult && hasActions && (
            <button
              onClick={onStartAnalysis}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Running Analysis...' : 'Analyze Recording'}
            </button>
          )}
          {!hasAnalysisResult && (
            <button
              onClick={onReset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Start New Test
            </button>
          )}        </div>
      </div>
    </div>
  );
};

export default AnalysisControls;
