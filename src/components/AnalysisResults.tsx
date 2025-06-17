/**
 * Display accessibility analysis results with warnings support
 */

import React, { useRef, useState } from 'react';
import { exportAnalysisToPDF } from '../utils/pdfExport';
import { html as beautifyHtml } from 'js-beautify';
import type { AnalysisResult } from '../types';

interface AnalysisResultsProps {
  analysisData: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Wraps HTML tags and attributes in code styling for better readability
 */
const formatTextWithCodeTags = (text: string): React.ReactElement => {
  // Pattern to match HTML tags (with angle brackets), backtick code, attributes, and CSS selectors
  const codePattern = /(`[^`]+`|<\/?[a-zA-Z][^>]*>|aria-[a-zA-Z-]+(?:="[^"]*")?|role="[^"]*"|class="[^"]*"|id="[^"]*"|\.[a-zA-Z_-]+|#[a-zA-Z_-]+)/g;
  
  const parts = text.split(codePattern);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches the code pattern (recreate regex to avoid global state)
        const isCode = /(`[^`]+`|<\/?[a-zA-Z][^>]*>|aria-[a-zA-Z-]+(?:="[^"]*")?|role="[^"]*"|class="[^"]*"|id="[^"]*"|\.[a-zA-Z_-]+|#[a-zA-Z_-]+)/.test(part);
        
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
        return <span key={index}>{part}</span>;
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
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
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

  const handleExportPDF = async () => {
    if (!analysisData) return;
    
    setIsExporting(true);
    try {
      await exportAnalysisToPDF(analysisData, resultsRef.current || undefined);
    } catch (error) {
      console.error('PDF export failed:', error);
      // You could add a toast notification here
    } finally {
      setIsExporting(false);
    }
  };
  if (isLoading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
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
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Results</h3>
        <p className="text-gray-500">
          No analysis results yet. Complete a recording and replay to see accessibility analysis here.
        </p>
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

      {/* Basic Analysis Results */}
      <div ref={resultsRef} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <p className="text-sm text-gray-500">
              {analysisData.snapshotCount} snapshots analyzed • Session: {analysisData.sessionId}
            </p>
          </div>
          
          {/* Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-sm">📄</span>
            <span className="text-sm font-medium">
              {isExporting ? 'Generating PDF...' : 'Export PDF'}
            </span>
          </button>
        </div>        {/* Gemini Analysis Results */}
        {analysisData.analysis ? (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">              <h3 className="text-xl font-medium text-gray-900 mb-6 text-center">Issues Identified</h3>
              
              {/* Component Issues */}
              {analysisData.analysis.components && analysisData.analysis.components.length > 0 && (<div className="mb-6">
                  
                  {/* Issue Count Summary */}
                  {(() => {
                    const counts = filteredComponents.reduce((acc, component) => {
                      acc[component.impact] = (acc[component.impact] || 0) + 1;
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
                                className={`relative text-center p-3 border rounded-lg transition-all hover:scale-105 ${
                                  severityFilters[impact] 
                                    ? 'bg-gray-50 border-gray-300 shadow-sm' 
                                    : 'bg-gray-100 border-gray-200 opacity-60'
                                }`}
                                title={`${severityFilters[impact] ? 'Hide' : 'Show'} ${impact} issues`}
                              >
                                {/* Checkbox in top-right corner */}
                                <div className="absolute top-1 right-1">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    severityFilters[impact]
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'bg-white border-gray-300'
                                  }`}>
                                    {severityFilters[impact] && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
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
                        <p className="text-xs text-gray-500 text-center mb-6">Click boxes above to toggle filter</p>
                      </>
                    );
                  })()}
                  <div className="space-y-4">
                    {filteredComponents.length > 0 ? (
                      filteredComponents.map((component, index) => (                      <div key={index} className="bg-white border border-gray-300 rounded-lg overflow-hidden">                        {/* Header Section with Subtle Background */}
                        <div className="bg-gray-50/30 border-b border-gray-200 px-4 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-medium text-gray-900">{component.componentName}</h4>
                              <p className="text-sm text-gray-500 mt-2 mb-1">
                                URL: <code className="px-1 py-0.5 bg-white text-gray-800 rounded text-sm font-mono border border-gray-200">{analysisData.manifest?.url || 'Unknown'}</code>
                              </p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              component.impact === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                              component.impact === 'serious' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                              component.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {component.impact.toUpperCase()} IMPACT
                            </span>
                          </div>
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
                            <span className="text-base font-medium text-gray-700">Explanation: </span>
                            <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                              {formatTextWithCodeTags(component.explanation)}
                            </div>
                          </div>                          {component.relevantHtml && (
                            <div>
                              <span className="text-base font-medium text-gray-700">Offending Code: </span>
                              <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-gray-700 overflow-x-auto" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                                <code>{formatHtmlCode(component.relevantHtml)}</code>
                              </pre>
                            </div>
                          )}
                            {component.correctedCode && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-base font-medium text-gray-700">Recommended: </span>
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
                              <div className="text-base text-gray-600 block mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
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
                                href={`https://www.w3.org/WAI/WCAG21/Understanding/${component.wcagRule.toLowerCase().replace(/\s+/g, '-')}.html`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base text-blue-600 hover:text-blue-800 underline"
                                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}
                              >
                                {component.wcagRule}                              </a>
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
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default AnalysisResults;
