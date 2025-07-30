/**
 * Display accessibility analysis results with warnings support
 */

import React, { useState } from 'react';
import { html as beautifyHtml } from 'js-beautify';
import type { AnalysisResult } from '../types';
import AxeResults from './AxeResults';
import { isAuthUrl } from '../utils/authDetection';

interface AnalysisResultsProps {
  analysisData: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Simple text formatter for accessibility recommendations - handles URLs, line breaks, and backtick code
 */
const formatTextWithLinks = (text: string): React.ReactElement => {
  // Split on URLs and backtick code to handle them separately
  const pattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|`[^`]+`)/g;
  const parts = text.split(pattern);

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
              className="text-info hover:text-matte-blue underline break-words"
            >
              {part}
            </a>
          );
        }
        
        // Check if this is backtick code
        if (/^`[^`]+`$/.test(part)) {
          const codeText = part.slice(1, -1); // Remove backticks
          return (
            <code key={index} className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">
              {codeText}
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

  // Helper to get the correct URL for a given step from manifest.stepDetails
  const getStepUrl = (step: number | string | undefined) => {
    if (!analysisData || !analysisData.manifest || !Array.isArray(analysisData.manifest.stepDetails) || step === undefined || step === null) {
      return 'Unknown';
    }
    let url = analysisData.manifest.stepDetails.find((s: any) => s.step === step)?.url || 'Unknown';
    return url;
  };

  // Helper to check if a component is from an authentication step and should be filtered out
  function isAuthComponent(step: number | string | undefined) {
    if (step === undefined || step === null) return false;
    
    const url = getStepUrl(step);
    if (url === 'Unknown') return false;
    
    return isAuthUrl(url).isAuthStep;
  }

  // Filter components based on selected severities, exclude auth steps, and sort by step (capture order)
  const filteredComponents = (analysisData?.analysis?.components.filter(component =>
    severityFilters[component.impact] && !isAuthComponent(component.step)
  ) || []).slice().sort((a, b) => {
    // Sort by step in ascending order (capture order), fallback to 0 if missing
    const stepA = typeof a.step === 'number' ? a.step : 0;
    const stepB = typeof b.step === 'number' ? b.step : 0;
    return stepA - stepB; // Ascending order: step 1, step 2, step 3, etc.
  });

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
        <div className="mx-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
      )}      {/* Screen Reader Analysis Results */}
      {analysisData.analysis && analysisData.analysis.components && analysisData.analysis.components.length > 0 && (        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card -mx-6">
          <div className="flex items-center justify-center py-5 px-4 relative">
            <h2 className="text-xl font-medium text-gray-900 text-center">
              Screen Reader Accessibility Issues ({analysisData.analysis.components.length})
            </h2>            <button
              onClick={() => setIsScreenReaderExpanded(!isScreenReaderExpanded)}
              className="text-base text-slate hover:text-neutral-black underline absolute right-4"
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
                          <div className="ml-4 text-right">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${component.impact === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                              component.impact === 'serious' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                component.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                  'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}>
                              {component.impact.toUpperCase()} IMPACT
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center">
                            <span>URL: </span>
                            {(() => {
                              const url = getStepUrl(component.step);
                              const displayUrl = url.length > 100 ? url.substring(0, 97) + '...' : url;
                              return (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={url}
                                  className="px-1 py-0.5 bg-white text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded text-sm font-mono border border-gray-200 ml-1 underline cursor-pointer"
                                >
                                  {displayUrl}
                                </a>
                              );
                            })()}
                          </div>
                          <span className="text-xs text-gray-400 mr-1">
                            screen reader accessibility
                          </span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        <div className="space-y-6 text-left">
                          <div>
                            <span className="text-base font-medium text-gray-700">Issue: </span>
                            <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                              {formatTextWithLinks(component.issue)}
                            </div>
                          </div>
                          <div>
                            <span className="text-base font-medium text-gray-700">Explanation:</span>
                            <div className="text-base text-gray-600 mt-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                              {formatTextWithLinks(component.explanation)}
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
                                {formatTextWithLinks(component.codeChangeSummary)}
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
                                className="text-base text-info hover:text-matte-blue underline"
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

      {/* Screen Reader Analysis - No Issues Found State */}
      {analysisData.analysis && analysisData.analysis.components && analysisData.analysis.components.length === 0 && (
        <details className="mt-6 border-t border-gray-200 pt-6">
          <summary className="cursor-pointer flex items-center justify-center">
            <h4 className="text-lg font-medium text-gray-900 text-center">
              Screen Reader Accessibility Issues
            </h4>
            <span className="text-sm text-green-600 font-medium ml-4">
              🔍 No issues found
            </span>
          </summary>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              The AI analysis found no screen reader accessibility issues in the captured snapshots.
            </p>
          </div>
        </details>
      )}

      {/* No Analysis Data State - only show if there's no AI analysis AND no axe results exist */}
      {(!analysisData.analysis || !analysisData.analysis.components || analysisData.analysis.components.length === 0) && 
       !analysisData.axeResults && (
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
        <AxeResults axeResults={analysisData.axeResults} manifest={analysisData.manifest} />
      )}

      {/* DEBUG: Log screen reader issues and manifest stepDetails */}
      {/* (debug useEffect is now at the top of the component, not rendered here) */}
    </div>
  );
};

export default AnalysisResults;
