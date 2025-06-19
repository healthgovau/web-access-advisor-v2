/**
 * Display accessibility analysis results with warnings support
 */

import React, { useState } from 'react';
import { html as beautifyHtml } from 'js-beautify';
import type { AnalysisResult } from '../types';
import AxeResults from './AxeResults';

interface AnalysisResultsProps {
  analysisData: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Wraps HTML tags, attributes, and URLs with appropriate styling and links
 */
const formatTextWithCodeTags = (text: string): React.ReactElement => {
  // First, put "See:" URLs on their own lines
  const processedText = text.replace(/(\.\s+See:\s+)(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g, '.\n\nSee: $2');
  
  // Enhanced pattern to match URLs, HTML tags, attributes, CSS selectors, and backtick code
  const pattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|`[^`]+`|<\/?[a-zA-Z0-9][^>]*>|&lt;\/?[a-zA-Z0-9][^&]*&gt;|aria-[a-zA-Z-]+(?:="[^"]*")?|role="[^"]*"|class="[^"]*"|id="[^"]*"|data-[a-zA-Z-]+="[^"]*"|\.[a-zA-Z_-][a-zA-Z0-9_-]*|#[a-zA-Z_-][a-zA-Z0-9_-]*)/g;

  const parts = processedText.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this is a URL
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline break-words"
            >
              {part}
            </a>
          );
        }
        
        // Check if this part matches the code pattern (recreate regex to avoid global state)
        const isCode = /(`[^`]+`|<\/?[a-zA-Z0-9][^>]*>|&lt;\/?[a-zA-Z0-9][^&]*&gt;|aria-[a-zA-Z-]+(?:="[^"]*")?|role="[^"]*"|class="[^"]*"|id="[^"]*"|data-[a-zA-Z-]+="[^"]*"|\.[a-zA-Z_-][a-zA-Z0-9_-]*|#[a-zA-Z_-][a-zA-Z0-9_-]*)/.test(part);

        if (isCode && part.trim()) {
          // Remove backticks from display but keep the styling
          const displayText = part.startsWith('`') && part.endsWith('`')
            ? part.slice(1, -1)
            : part;

          return (
            <code key={index} className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">
              {displayText}
            </code>
          );
        }
        
        // Handle line breaks in regular text
        return (
          <span key={index}>
            {part.split('\n').map((line, lineIndex, lines) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
};

/**
 * Cleans up HTML formatting for better display with proper indentation
 */
const formatHtmlCode = (html: string): string => {
  if (!html) return '';

  try {
    return beautifyHtml(html, {
      indent_size: 2,
      indent_char: ' ',
      max_preserve_newlines: 1,
      preserve_newlines: true,
      wrap_line_length: 80,
      indent_inner_html: true,
      indent_body_inner_html: true,
      indent_head_inner_html: true
    });
  } catch (error) {
    // Fallback: just return cleaned HTML
    console.warn('HTML beautify failed:', error);
    return html.replace(/\s+/g, ' ').trim();
  }
};

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysisData, isLoading, error }) => {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isScreenReaderExpanded, setIsScreenReaderExpanded] = useState(false);
  const [severityFilters, setSeverityFilters] = useState<Record<string, boolean>>({
    critical: true,
    serious: true,
    moderate: true,
    minor: true
  });

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedStates(prev => ({ ...prev, [id]: true }));

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleSeverityFilterChange = (severity: string, checked: boolean) => {
    setSeverityFilters(prev => ({
      ...prev,
      [severity]: checked
    }));
  };

  // Filter components based on selected severities
  const filteredComponents = analysisData?.analysis?.components.filter(component =>
    severityFilters[component.impact]
  ) || [];

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Analyzing accessibility...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <span className="text-red-500 text-xl">❌</span>
          <div>
            <h3 className="text-lg font-medium text-red-800">Analysis Error</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          No analysis data available
        </div>
      </div>
    );
  }

  // Handle warnings (e.g., Gemini not available)
  const hasWarnings = analysisData.warnings && analysisData.warnings.length > 0;
  
  return (
    <div className="space-y-4">
      {/* Warnings Display */}
      {hasWarnings && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-yellow-500 text-xl">⚠️</span>
              <h3 className="text-sm font-medium text-yellow-800">Analysis Limitations</h3>
            </div>
            <ul className="text-yellow-700 text-sm space-y-1">
              {analysisData.warnings?.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Screen Reader Analysis Results */}
      {analysisData.analysis && analysisData.analysis.components && analysisData.analysis.components.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-6">
          <div className="flex items-center justify-center p-2 relative">
            <h2 className="text-xl font-medium text-gray-900 text-center">
              Screen Reader Accessibility Issues ({analysisData.analysis.components.length})
            </h2>
            <button
              onClick={() => setIsScreenReaderExpanded(!isScreenReaderExpanded)}
              className="text-sm text-gray-600 hover:text-gray-900 underline absolute right-4"
            >
              {isScreenReaderExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {isScreenReaderExpanded && (
            <div className="p-3 space-y-3">
              {/* Issue Count Summary */}
              {(() => {
                // Calculate counts from ALL components, not just filtered ones
                const counts = (analysisData.analysis?.components || []).reduce((acc, component) => {
                  acc[component.impact] = (acc[component.impact] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                // Color scheme for severity levels
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
                return (
                  <>
                    <div className="w-full flex justify-center mb-3 mt-2">
                      <div className="inline-grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['critical', 'serious', 'moderate', 'minor'].map(impact => (
                          <button
                            key={impact}
                            onClick={() => handleSeverityFilterChange(impact, !severityFilters[impact])}
                            className={`relative text-center p-3 border rounded transition-all hover:scale-105 ${getSeverityColors(impact, severityFilters[impact])}`}
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
                    <p className="text-xs text-gray-500 text-center mb-3">Click boxes above to toggle filter</p>
                  </>
                );
              })()}
              
              <div className="space-y-3">
                {filteredComponents.length > 0 ? (
                  filteredComponents.map((component, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded overflow-hidden">
                      {/* Header Section with Subtle Background */}
                      <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-base font-medium text-gray-900">{component.componentName}</h4>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ml-4 ${component.impact === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                            component.impact === 'serious' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                              component.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                            {component.impact.toUpperCase()} IMPACT
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 text-left">
                          URL: <code className="px-1 py-0.5 bg-white text-gray-800 rounded text-sm font-mono border border-gray-200">{analysisData.manifest?.url || 'Unknown'}</code>
                        </p>
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        <div className="space-y-6 text-left">
                          <div>
                            <span className="text-base font-medium text-gray-700">Issue: </span>
                            <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                              {formatTextWithCodeTags(component.issue)}
                            </div>
                          </div>
                          <div>
                            <span className="text-base font-medium text-gray-700">Explanation:</span>
                            <div className="text-base text-gray-600 mt-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                              {formatTextWithCodeTags(component.explanation)}
                            </div>
                          </div>
                          {component.relevantHtml && (
                            <div>
                              <span className="text-base font-medium text-gray-700">Offending Code: </span>
                              <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-gray-700 overflow-x-auto" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                                <code>{formatHtmlCode(component.relevantHtml)}</code>
                              </pre>
                            </div>
                          )}
                          {component.selector && (
                            <div>
                              <span className="text-xs font-medium text-gray-600">Selector: </span>
                              <code className="px-1 py-0.5 bg-white text-gray-700 rounded text-xs font-mono border border-gray-200">
                                {component.selector}
                              </code>
                            </div>
                          )}
                          {component.correctedCode && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-base font-medium text-gray-700">Recommended:</span>
                                <button
                                  onClick={() => handleCopyCode(component.correctedCode, `recommended-${index}`)}
                                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded border border-green-300 transition-colors"
                                  title="Copy recommended code"
                                >
                                  <span className="text-xs">
                                    {copiedStates[`recommended-${index}`] ? '✓' : '📋'}
                                  </span>
                                  <span>{copiedStates[`recommended-${index}`] ? 'Copied!' : 'Copy'}</span>
                                </button>
                              </div>
                              <div className="text-base text-gray-600 block mt-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                                {formatTextWithCodeTags(component.codeChangeSummary)}
                              </div>
                              <pre className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-gray-700 overflow-x-auto" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                                <code>{formatHtmlCode(component.correctedCode)}</code>
                              </pre>
                            </div>
                          )}
                          {component.wcagRule && (
                            <div>
                              <span className="text-base font-medium text-gray-700">WCAG Guideline: </span>
                              <a
                                href={component.wcagUrl || 'https://www.w3.org/WAI/WCAG21/Understanding/'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base text-blue-600 hover:text-blue-800 underline"
                                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}
                              >
                                {component.wcagRule}
                              </a>
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
        </div>
      )}

      {/* No Analysis Data State */}
      {(!analysisData.analysis || !analysisData.analysis.components || analysisData.analysis.components.length === 0) && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="text-center py-8">
            <span className="text-gray-400 text-4xl">
              {analysisData.snapshotCount === 0 ? '⚠️' : '🔍'}
            </span>
            <h5 className="text-gray-600 font-medium mt-2">
              {analysisData.snapshotCount === 0 ? 'No Analysis Performed' : 'Basic Accessibility Scan Complete'}
            </h5>
            <p className="text-gray-500 text-sm mt-1">
              {analysisData.snapshotCount === 0 ? (
                'No user actions were recorded, so no snapshots could be analyzed.'
              ) : (
                <>
                  {hasWarnings ? 'AI analysis was unavailable. ' : ''}
                  Axe accessibility scans have been completed for all captured snapshots.
                </>
              )}
            </p>
            {analysisData.snapshotCount === 0 && (
              <p className="text-blue-600 text-sm mt-2">
                Try recording some interactions with the website before running analysis.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Automated Accessibility Scan Results */}
      {analysisData.axeResults && (
        <AxeResults axeResults={analysisData.axeResults} url={analysisData.manifest?.url} />
      )}
    </div>
  );
};

export default AnalysisResults;
