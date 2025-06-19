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
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-xl font-medium text-brand-dark mb-2">Recorded Actions</h3>
        <p className="text-base text-slate">No actions recorded yet. Start recording to see interactions here.</p>
      </div>
    );
  }  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-neutral-light">
        <h3 className="text-xl font-medium text-brand-dark">
          Actions
        </h3>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-base text-slate hover:text-neutral-black underline"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (        <div className="max-h-64 overflow-y-auto overflow-x-hidden">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionList;
