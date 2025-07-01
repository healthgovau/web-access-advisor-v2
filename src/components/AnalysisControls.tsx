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
}) => {  return (
    <div className="card rounded-lg p-6">
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
              {isLoading ? 'Running Analysis...' : 'Analyze Recording'}
            </button>
          )}
          <button
            onClick={onReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Start New Test
          </button>        </div>
      </div>
      
      {!hasAnalysisResult && hasActions && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3 text-left">
              Static sections (header, footer, navigation)
            </legend>
            <div className="space-y-3">
              <div className="flex items-start">
                <input
                  id="static-ignore"
                  name="staticSectionMode"
                  type="radio"
                  value="ignore"
                  checked={staticSectionMode === 'ignore'}
                  onChange={(e) => onStaticSectionModeChange(e.target.value as 'include' | 'ignore' | 'separate')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mt-0.5 flex-shrink-0"
                />
                <div className="ml-3 text-left">
                  <label htmlFor="static-ignore" className="block text-sm text-gray-700 font-medium text-left">
                    Ignore - focus only on main content
                  </label>
                  <p className="text-xs text-gray-500 mt-1 text-left">
                    Skip headers, footers, and navigation. Analyze only unique page content.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <input
                  id="static-separate"
                  name="staticSectionMode"
                  type="radio"
                  value="separate"
                  checked={staticSectionMode === 'separate'}
                  onChange={(e) => onStaticSectionModeChange(e.target.value as 'include' | 'ignore' | 'separate')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mt-0.5 flex-shrink-0"
                />
                <div className="ml-3 text-left">
                  <label htmlFor="static-separate" className="block text-sm text-gray-700 font-medium text-left">
                    Analyze static content once only
                  </label>
                  <p className="text-xs text-gray-500 mt-1 text-left">
                    Analyze main content normally, but handle static sections separately to avoid re-analyzing identical headers/footers.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <input
                  id="static-include"
                  name="staticSectionMode"
                  type="radio"
                  value="include"
                  checked={staticSectionMode === 'include'}
                  onChange={(e) => onStaticSectionModeChange(e.target.value as 'include' | 'ignore' | 'separate')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mt-0.5 flex-shrink-0"
                />
                <div className="ml-3 text-left">
                  <label htmlFor="static-include" className="block text-sm text-gray-700 font-medium text-left">
                    Don't ignore - analyze all content
                  </label>
                  <p className="text-xs text-gray-500 mt-1 text-left">
                    Analyze headers, footers, navigation, and main content together in one analysis.
                  </p>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
};

export default AnalysisControls;
