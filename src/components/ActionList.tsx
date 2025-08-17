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
    const iconClass = "w-5 h-5 flex-shrink-0 text-current";
    switch (actionType) {
      case 'click':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5l12 7-12 7V5z" />
          </svg>
        );
      case 'fill':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l1.586-1.586 4.95 4.95L13.95 15.95 9 11z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 20h16" />
          </svg>
        );
      case 'select':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 2h6a2 2 0 012 2v2H7V4a2 2 0 012-2zM7 8h10v12H7V8z" />
          </svg>
        );
      case 'navigate':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12h20M12 2a15.3 15.3 0 010 20" />
          </svg>
        );
      case 'scroll':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4h10v16H7V4zM7 8h10M7 12h10M7 16h10" />
          </svg>
        );
      case 'hover':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        );
    }
  }; const formatActionDescription = (action: any) => {
    switch (action.type) {
      case 'click':
        if (action.selector) {
          // Clean up selector for display - remove complex nth-child patterns and show the most relevant part
          let displaySelector = action.selector;
          
          // Extract the most meaningful part of the selector
          if (displaySelector.includes('#')) {
            // Prefer ID selectors
            const idMatch = displaySelector.match(/#[^.\s\[\>]+/);
            if (idMatch) displaySelector = idMatch[0];
          } else if (displaySelector.includes('.')) {
            // Use class selectors, take the first one
            const classMatch = displaySelector.match(/\.[^.\s\[\>]+/);
            if (classMatch) displaySelector = classMatch[0];
          } else if (displaySelector.includes('[')) {
            // Use attribute selectors
            const attrMatch = displaySelector.match(/\[[^\]]+\]/);
            if (attrMatch) displaySelector = attrMatch[0];
          } else {
            // Clean up complex selectors - take the rightmost meaningful part
            const parts = displaySelector.split(/\s*>\s*/);
            displaySelector = parts[parts.length - 1] || displaySelector;
            // Remove nth-child for readability
            displaySelector = displaySelector.replace(/:nth-child\(\d+\)/, '');
          }
          
          return `Clicked ${displaySelector}`;
        }
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
  }; if (actions.length === 0 && !isRecording) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card"><div className="flex items-center justify-center py-6 px-2 relative">
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
  } return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card"><div className="flex items-center justify-center py-6 px-2 relative">
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
                  <div className="text-base font-medium text-gray-700 break-words flex-1 mr-4">
                    {formatActionDescription(action)}
                  </div>
                  <span className="text-md text-gray-500 font-mono flex-shrink-0 mr-2">
                    #{index + 1}
                  </span>
                  <div className="text-sm text-slate flex-shrink-0">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionList;
