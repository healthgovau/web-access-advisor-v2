/**
 * Real-time list of recorded user actions
 */

import { useState } from 'react';

interface ActionListProps {
  actions: any[];
  isRecording: boolean;
  sessionId?: string;
}

const ActionList: React.FC<ActionListProps> = ({ actions, isRecording, sessionId }) => {
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
  };  const formatActionDescription = (action: any) => {
    switch (action.type) {
      case 'click':
        return 'Clicked element';
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
        return (
          <span>
            Navigated to{' '}            <a 
              href={action.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-info hover:text-matte-blue underline break-all"
              style={{ color: 'var(--matte-blue)' }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--bright-blue)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--matte-blue)'}
              title={action.url}
            >
              {truncatedUrl}
            </a>
          </span>
        );
      case 'scroll':
        return 'Scrolled page';
      default:
        return `${action.type} action`;
    }
  };  if (actions.length === 0 && !isRecording) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card">        <div className="flex items-center justify-center py-6 px-2 relative">
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-900">
              Recorded Actions
            </h2>
            {sessionId && (
              <div className="text-sm text-gray-500 mt-1">
                {sessionId}
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          <p className="text-base text-slate text-center">No actions recorded yet. Start recording to see interactions here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card">      <div className="flex items-center justify-center py-6 px-2 relative">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">
            Recorded Actions ({actions.length})
          </h2>
          {sessionId && (
            <div className="text-sm text-gray-500 mt-1">
              {sessionId}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-base text-slate hover:text-neutral-black underline absolute right-4"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3">
          <div className="max-h-64 overflow-y-auto overflow-x-hidden">
          {actions.length === 0 && isRecording && (
            <div className="p-4 text-center text-base text-slate">
              Recording started. Interact with the page to see actions here.
            </div>
          )}

          {actions.map((action: any, index: number) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-3 border-b border-neutral-light last:border-b-0 hover:bg-neutral-xx-light"
            >
              <span className="text-xl flex-shrink-0">{getActionIcon(action.type)}</span>

              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="text-base font-medium text-neutral-black break-words flex-1 mr-4">
                  {formatActionDescription(action)}
                </div>

                <div className="text-sm text-slate flex-shrink-0">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </div>
              </div>

              <span className="text-sm text-silver font-mono flex-shrink-0">
                #{index + 1}
              </span>
            </div>          ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionList;
