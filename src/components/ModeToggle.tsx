/**
 * Mode toggle component - switches between Manual and Auto modes
 * Defaults to Manual mode as agreed
 */

import { useState } from 'react';

const ModeToggle = ({ mode, onModeChange }) => {
  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">Testing Mode:</span>
      
      <div className="flex bg-white rounded-lg border border-gray-200 p-1">
        <button
          onClick={() => onModeChange('manual')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'manual'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          Manual
        </button>
        
        <button
          onClick={() => onModeChange('auto')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'auto'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          Auto (Experimental)
        </button>
      </div>
      
      {mode === 'auto' && (
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          ⚠️ Auto mode is experimental and may not work on complex pages
        </span>
      )}
    </div>
  );
};

export default ModeToggle;
