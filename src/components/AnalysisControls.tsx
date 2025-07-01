/**
 * Analysis controls for starting analysis and resetting
 */

import React from 'react';

interface AnalysisControlsProps {
  hasActions: boolean;
  hasAnalysisResult: boolean;
  isLoading: boolean;
  filterStaticSections: boolean;
  onFilterStaticSectionsChange: (enabled: boolean) => void;
  onStartAnalysis: () => void;
  onReset: () => void;
}

const AnalysisControls: React.FC<AnalysisControlsProps> = ({
  hasActions,
  hasAnalysisResult,
  isLoading,
  filterStaticSections,
  onFilterStaticSectionsChange,
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
      
      {hasActions && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center">
            <input
              id="filter-static-sections"
              type="checkbox"
              checked={filterStaticSections}
              onChange={(e) => onFilterStaticSectionsChange(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="filter-static-sections" className="ml-2 block text-sm text-gray-700">
              Ignore static sections (header, footer, navigation) to focus on page content
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisControls;
