/**
 * Real-time list of recorded user actions
 */

import { useState } from 'react';

const ActionList = ({ actions, isRecording }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'click': return '👆';
      case 'fill': return '✏️';
      case 'select': return '📋';
      case 'navigate': return '🌐';
      case 'scroll': return '📜';
      case 'hover': return '🔍';
      default: return '⚡';
    }
  };

  const formatActionDescription = (action) => {
    switch (action.type) {
      case 'click':
        return `Clicked ${action.selector}`;
      case 'fill':
        return `Filled "${action.value}" in ${action.selector}`;
      case 'select':
        return `Selected "${action.value}" in ${action.selector}`;
      case 'navigate':
        return `Navigated to ${action.url}`;
      case 'scroll':
        return `Scrolled to ${action.position}`;
      default:
        return `${action.type} on ${action.selector}`;
    }
  };

  if (actions.length === 0 && !isRecording) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Recorded Actions</h3>
        <p className="text-sm text-gray-500">No actions recorded yet. Start recording to see interactions here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Recorded Actions ({actions.length})
        </h3>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {actions.length === 0 && isRecording && (
            <div className="p-4 text-center text-sm text-gray-500">
              Recording started. Interact with the page to see actions here.
            </div>
          )}
          
          {actions.map((action, index) => (
            <div 
              key={index}
              className="flex items-start space-x-3 p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <span className="text-lg">{getActionIcon(action.type)}</span>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {formatActionDescription(action)}
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </div>
                
                {action.selector && (
                  <div className="text-xs text-gray-400 font-mono mt-1 truncate">
                    {action.selector}
                  </div>
                )}
              </div>
              
              <span className="text-xs text-gray-400 font-mono">
                #{index + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionList;
