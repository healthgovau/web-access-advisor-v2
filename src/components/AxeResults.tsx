/**
 * Display automated accessibility scan results from axe-core
 */

import React, { useState } from 'react';
import type { AxeViolation } from '../types';

interface AxeResultsProps {
  axeResults: AxeViolation[];
}

const AxeResults: React.FC<AxeResultsProps> = ({ axeResults }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [severityFilters, setSeverityFilters] = useState<Record<string, boolean>>({
    critical: true,
    serious: true,
    moderate: true,
    minor: true
  });

  // Filter violations by severity
  const filteredViolations = axeResults.filter(violation => 
    severityFilters[violation.impact]
  );

  const handleSeverityFilterChange = (severity: string, checked: boolean) => {
    setSeverityFilters(prev => ({
      ...prev,
      [severity]: checked
    }));
  };

  // Color scheme for severity levels (matching main analysis section)
  const getSeverityColors = (severity: string, isActive: boolean) => {
    const baseClasses = {
      critical: isActive
        ? 'bg-red-50 border-red-300 text-red-800'
        : 'bg-red-100 border-red-200 text-red-700 opacity-60',
      serious: isActive
        ? 'bg-orange-50 border-orange-300 text-orange-800'
        : 'bg-orange-100 border-orange-200 text-orange-700 opacity-60',
      moderate: isActive
        ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
        : 'bg-yellow-100 border-yellow-200 text-yellow-700 opacity-60',
      minor: isActive
        ? 'bg-blue-50 border-blue-300 text-blue-800'
        : 'bg-blue-100 border-blue-200 text-blue-700 opacity-60'
    };
    return baseClasses[severity as keyof typeof baseClasses] || baseClasses.minor;
  };

  if (axeResults.length === 0) {
    return (      <details className="mt-6 border-t border-gray-200 pt-6">
        <summary className="cursor-pointer flex items-center justify-center">
          <h4 className="text-lg font-medium text-gray-900 text-center">
            Axe Accessibility Issues
          </h4>
          <span className="text-sm text-green-600 font-medium ml-4">
            ✅ No violations found
          </span>
        </summary>
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            The automated accessibility scan found no violations in the captured snapshots.
          </p>
        </div>
      </details>
    );
  }

  return (    <details className="mt-6 border-t border-gray-200 pt-6" open={isExpanded}>
      <summary 
        className="cursor-pointer flex items-center justify-center"
        onClick={(e) => {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }}
      >
        <h4 className="text-lg font-medium text-gray-900 text-center">
          Axe Accessibility Issues
        </h4>
        <div className="flex items-center space-x-3 ml-4">
          <span className="text-sm text-gray-600">
            {axeResults.length} issue{axeResults.length !== 1 ? 's' : ''} found
          </span>
          <span className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </summary>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Issue Count Summary - matching main analysis section styling */}
          {(() => {
            // Calculate counts from ALL violations, not just filtered ones
            const counts = axeResults.reduce((acc, violation) => {
              acc[violation.impact] = (acc[violation.impact] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            return (
              <>
                <div className="w-full flex justify-center mb-4">
                  <div className="inline-grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['critical', 'serious', 'moderate', 'minor'].map(impact => (
                      <button
                        key={impact}
                        onClick={() => handleSeverityFilterChange(impact, !severityFilters[impact])}
                        className={`relative text-center p-3 border rounded-lg transition-all hover:scale-105 ${getSeverityColors(impact, severityFilters[impact])}`}
                        title={`${severityFilters[impact] ? 'Hide' : 'Show'} ${impact} issues`}
                      >
                        {/* Checkbox in top-right corner */}
                        <div className="absolute top-1 right-1">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${severityFilters[impact]
                            ? impact === 'critical' ? 'bg-white border-red-300' :
                              impact === 'serious' ? 'bg-white border-orange-300' :
                                impact === 'moderate' ? 'bg-white border-yellow-300' :
                                  'bg-white border-blue-300'
                            : 'bg-white border-gray-300'
                            }`}>
                            {severityFilters[impact] && (
                              <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>

                        <div className="text-lg font-bold text-gray-900">{counts[impact] || 0}</div>
                        <div className="text-xs font-medium text-gray-600 uppercase">{impact}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center mb-10">Click boxes above to toggle filter</p>
              </>
            );
          })()}          {/* Violations List - matching main analysis section styling */}
          <div className="space-y-4">
            {filteredViolations.length > 0 ? (
              filteredViolations.map((violation, index) => (
                <div key={`${violation.id}-${index}`} className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                  {/* Header Section with Subtle Background */}
                  <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-base font-medium text-gray-900">{violation.help}</h4>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ml-4 ${
                        violation.impact === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                        violation.impact === 'serious' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                        violation.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                        'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {violation.impact.toUpperCase()} IMPACT
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 text-left">
                      Rule ID: <code className="px-1 py-0.5 bg-white text-gray-800 rounded text-sm font-mono border border-gray-200">{violation.id}</code>
                    </p>
                  </div>

                  {/* Content Section */}
                  <div className="p-4">
                    <div className="space-y-6 text-left">
                      <div>
                        <span className="text-base font-medium text-gray-700">Issue: </span>
                        <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                          {violation.description}
                        </div>
                      </div>                      {violation.helpUrl && (
                        <div>
                          <span className="text-base font-medium text-gray-700">WCAG Guideline: </span>
                          <a
                            href={violation.helpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-blue-600 hover:text-blue-800 underline"
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}
                          >
                            {violation.id}
                          </a>
                        </div>
                      )}

                      {violation.nodes && violation.nodes.length > 0 && (
                        <div>
                          <span className="text-base font-medium text-gray-700">Affected Elements ({violation.nodes.length}): </span>
                          <div className="mt-2 space-y-3">
                            {violation.nodes.slice(0, 5).map((node, nodeIndex) => (
                              <div key={nodeIndex} className="bg-gray-50 border border-gray-200 rounded p-3">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  Selector: <code className="px-1 py-0.5 bg-white text-gray-800 rounded text-sm font-mono border border-gray-200">
                                    {Array.isArray(node.target) ? node.target.join(' > ') : node.target}
                                  </code>
                                </div>
                                {node.html && (
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">HTML: </span>
                                    <pre className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-gray-700 overflow-x-auto" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                                      <code>{node.html}</code>
                                    </pre>
                                  </div>
                                )}
                                {node.failureSummary && (
                                  <div className="mt-2">
                                    <span className="text-sm font-medium text-gray-700">Failure: </span>
                                    <div className="text-sm text-red-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                                      {node.failureSummary}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {violation.nodes.length > 5 && (
                              <div className="text-sm text-gray-500 italic text-center py-2">
                                ... and {violation.nodes.length - 5} more elements
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {violation.tags && violation.tags.length > 0 && (
                        <div>
                          <span className="text-base font-medium text-gray-700">WCAG Tags: </span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {violation.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded font-mono"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <span className="text-gray-400 text-4xl">🔍</span>
                <h5 className="text-gray-600 font-medium mt-2">No Issues Match Current Filter</h5>
                <p className="text-gray-500 text-sm mt-1">
                  Try adjusting your severity filter selections above.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </details>
  );
};

export default AxeResults;
