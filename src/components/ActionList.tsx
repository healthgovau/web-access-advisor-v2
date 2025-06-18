/**
 * Real-time list of recorded user actions
 */

import { useState } from 'react';

interface ActionListProps {
  actions: any[];
  isRecording: boolean;
}

const ActionList: React.FC<ActionListProps> = ({ actions, isRecording }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  const getActionIcon = (actionType: string) => {
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
  const formatActionDescription = (action: any) => {
    switch (action.type) {
      case 'click':
        return `Clicked element`;
      case 'fill':
        const truncatedValue = action.value && action.value.length > 30 
          ? `${action.value.substring(0, 30)}...` 
          : action.value;
        return `Filled "${truncatedValue}" in input`;
      case 'select':
        const truncatedSelectValue = action.value && action.value.length > 30 
          ? `${action.value.substring(0, 30)}...` 
          : action.value;
        return `Selected "${truncatedSelectValue}"`;
      case 'navigate':
        const truncatedUrl = action.url && action.url.length > 50 
          ? `${action.url.substring(0, 50)}...` 
          : action.url;
        return `Navigated to ${truncatedUrl}`;
      case 'scroll':
        return `Scrolled page`;
      default:
        return `${action.type} action`;
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Actions ({actions.length})
        </h3>
          <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="max-h-64 overflow-y-auto overflow-x-hidden">
          {actions.length === 0 && isRecording && (
            <div className="p-4 text-center text-sm text-gray-500">
              Recording started. Interact with the page to see actions here.
            </div>
          )}
            {actions.map((action: any, index: number) => (
            <div 
              key={index}
              className="flex items-start space-x-3 p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <span className="text-lg flex-shrink-0">{getActionIcon(action.type)}</span>
              
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-sm font-medium text-gray-900 break-words">
                  {formatActionDescription(action)}
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </div>
                
                {action.selector && (
                  <div className="text-xs text-gray-400 font-mono mt-1 break-all overflow-hidden">
                    <span className="inline-block max-w-full truncate">
                      {action.selector}
                    </span>
                  </div>
                )}
              </div>
              
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">
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
