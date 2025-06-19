/**
 * Display automated accessibility scan results from axe-core
 */

import React, { useState } from 'react';
import { html as beautifyHtml } from 'js-beautify';
import type { AxeViolation } from '../types';

interface AxeResultsProps {
  axeResults: AxeViolation[];
  url?: string;
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
 * Format HTML code for better display with proper indentation
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

/**
 * Parse and render recommendation content with proper formatting matching LLM section
 */
const renderRecommendationContent = (recommendation: string): React.ReactElement => {
  // Clean up the recommendation text first
  const cleanedRecommendation = recommendation.trim();
  
  // Split by double newlines to identify major sections
  const sections = cleanedRecommendation.split(/\n\s*\n+/);
  
  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => {
        const trimmedSection = section.trim();
        if (!trimmedSection) return null;
        
        // Check if this section contains code examples
        if (trimmedSection.toLowerCase().includes('before:') && trimmedSection.toLowerCase().includes('after:')) {
          // Handle before/after code examples
          const lines = trimmedSection.split('\n');
          let beforeCode = '';
          let afterCode = '';
          let explanationText = '';
          let currentMode = 'explanation';
          
          lines.forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine.toLowerCase().startsWith('before:')) {
              currentMode = 'before';
              beforeCode = cleanLine.replace(/^before:\s*/i, '');
            } else if (cleanLine.toLowerCase().startsWith('after:') || cleanLine.toLowerCase().includes('after (')) {
              currentMode = 'after';
              afterCode = cleanLine.replace(/^after[^:]*:\s*/i, '');
            } else if (currentMode === 'before' && cleanLine) {
              beforeCode += '\n' + cleanLine;
            } else if (currentMode === 'after' && cleanLine) {
              afterCode += '\n' + cleanLine;
            } else if (currentMode === 'explanation' && cleanLine) {
              explanationText += (explanationText ? '\n' : '') + cleanLine;
            }
          });
          
          return (
            <div key={sectionIndex} className="space-y-4">
              {explanationText && (
                <div className="text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                  {formatTextWithCodeTags(explanationText)}
                </div>
              )}
              
              {beforeCode.trim() && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Before:</div>
                  <pre className="p-3 bg-red-50 border border-red-200 rounded text-sm text-gray-700 overflow-x-auto" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                    <code>{beforeCode.trim()}</code>
                  </pre>
                </div>
              )}
              
              {afterCode.trim() && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">After:</div>
                  <pre className="p-3 bg-green-50 border border-green-200 rounded text-sm text-gray-700 overflow-x-auto" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                    <code>{afterCode.trim()}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        }
        
        // Check for numbered lists and format them properly
        if (/^\d+\./.test(trimmedSection)) {
          // Split into individual numbered items
          const numberedItems = trimmedSection.split(/(?=^\d+\.)/m);
          
          return (
            <div key={sectionIndex} className="space-y-3">
              {numberedItems.map((item, itemIndex) => {
                const trimmedItem = item.trim();
                if (!trimmedItem) return null;
                
                // Extract number and content
                const match = trimmedItem.match(/^(\d+\.)\s*(.*)$/s);
                if (match) {
                  const [, number, content] = match;
                  
                  // Check for sub-steps (a., b., etc.)
                  const subSteps = content.split(/(?=^\s*[a-z]\.\s)/m);
                  
                  if (subSteps.length > 1) {
                    // Has sub-steps
                    return (
                      <div key={itemIndex} className="space-y-2">
                        <div className="text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                          <span className="font-semibold">{number}</span> {formatTextWithCodeTags(subSteps[0].trim())}
                        </div>
                        {subSteps.slice(1).map((subStep, subIndex) => {
                          const subMatch = subStep.trim().match(/^([a-z]\.)\s*(.*)$/s);
                          if (subMatch) {
                            const [, subNumber, subContent] = subMatch;
                            return (
                              <div key={subIndex} className="ml-6 text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                                <span className="font-semibold">{subNumber}</span> {formatTextWithCodeTags(subContent)}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    );
                  } else {
                    // Regular numbered item
                    return (
                      <div key={itemIndex} className="text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                        <span className="font-semibold">{number}</span> {formatTextWithCodeTags(content)}
                      </div>
                    );
                  }
                }
                return null;
              })}
            </div>
          );
        }
        
        // Check for section headings (Testing:, etc.)
        if (/^(Testing|Note|Important):/i.test(trimmedSection)) {
          const parts = trimmedSection.split(/^(Testing|Note|Important):\s*/i);
          if (parts.length >= 3) {
            const heading = parts[1];
            const content = parts[2];
            
            return (
              <div key={sectionIndex} className="space-y-3">
                <div className="text-base font-medium text-gray-700 mb-2">{heading}:</div>
                <div className="text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                  {formatTextWithCodeTags(content)}
                </div>
              </div>
            );
          }
        }
        
        // Regular paragraph
        return (
          <div key={sectionIndex} className="text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
            {formatTextWithCodeTags(trimmedSection)}
          </div>
        );
      })}
    </div>
  );
};

interface AxeResultsProps {
  axeResults: AxeViolation[];
  url?: string;
}

const AxeResults: React.FC<AxeResultsProps> = ({ axeResults, url }) => {
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
  }  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-6"><div className="flex items-center justify-center p-4 border-b border-neutral-light relative">
        <h4 className="text-xl font-medium text-brand-dark text-center">
          Axe Accessibility Issues ({axeResults.length})
        </h4>
          <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-base text-slate hover:text-neutral-black underline absolute right-4"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
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
                            : 'bg-white border-gray-200'
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
                <div key={`${violation.id}-${index}`} className="bg-white border border-gray-200 rounded overflow-hidden">
                  {/* Header Section with Subtle Background */}
                  <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-4">                    <div className="flex items-start justify-between mb-2">
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
                      URL: <code className="px-1 py-0.5 bg-white text-gray-800 rounded text-sm font-mono border border-gray-200">{url || 'Unknown'}</code>
                    </p>
                  </div>

                  {/* Content Section */}
                  <div className="p-4">
                    <div className="space-y-6 text-left">                      <div>
                        <span className="text-base font-medium text-gray-700">Issue: </span>
                        <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                          {formatTextWithCodeTags(violation.description)}
                        </div>
                      </div>

                      {/* LLM-generated explanation (if available) */}
                      {violation.explanation && (
                        <div>
                          <span className="text-base font-medium text-gray-700">Explanation: </span>
                          <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                            {formatTextWithCodeTags(violation.explanation)}
                          </div>
                        </div>
                      )}{violation.helpUrl && (
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
                      )}                      {violation.nodes && violation.nodes.length > 0 && (
                        <div>
                          <span className="text-base font-medium text-gray-700 mb-3">Offending Code ({violation.nodes.length}): </span>                          <div className="mt-3 space-y-4">
                            {violation.nodes.slice(0, 5).map((node, nodeIndex) => (
                              <div key={nodeIndex} className="bg-gray-50 border border-gray-200 rounded p-3">
                                <div className="space-y-3">
                                  {node.html && (
                                    <div>
                                      <pre className="p-3 bg-red-50 border border-red-200 rounded text-sm text-gray-700 overflow-x-auto" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                                        <code>{formatHtmlCode(node.html)}</code>
                                      </pre>
                                    </div>
                                  )}

                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Selector: </span>
                                    <code className="px-1 py-0.5 bg-white text-gray-700 rounded text-xs font-mono border border-gray-200">
                                      {Array.isArray(node.target) ? node.target.join(' > ') : node.target}
                                    </code>
                                  </div>

                                  {node.failureSummary && !violation.recommendation && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700 mb-2">Recommended: </span>
                                      <div className="text-sm text-gray-600 mt-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                                        {(() => {
                                          // Generate helpful recommendations based on violation type (fallback only)
                                          const ruleId = violation.id;
                                          const cleanFailure = node.failureSummary.replace(/^Fix all of the following:\s*/i, '').replace(/^Fix any of the following:\s*/i, '');
                                          
                                          // Common rule recommendations
                                          if (ruleId.includes('heading') || ruleId.includes('h1')) {
                                            return formatTextWithCodeTags('Add an h1 element to provide a main heading for the page content.');
                                          } else if (ruleId.includes('color-contrast')) {
                                            return formatTextWithCodeTags('Increase the contrast ratio between text and background colors to meet WCAG standards.');
                                          } else if (ruleId.includes('alt-text') || ruleId.includes('image-alt')) {
                                            return formatTextWithCodeTags('Add descriptive alt text to images for screen reader users.');
                                          } else if (ruleId.includes('label') || ruleId.includes('form')) {
                                            return formatTextWithCodeTags('Associate form inputs with descriptive labels using the for/id attributes.');
                                          } else if (ruleId.includes('aria')) {
                                            return formatTextWithCodeTags('Fix ARIA attributes to ensure they are properly implemented and accessible.');
                                          } else if (ruleId.includes('landmark') || ruleId.includes('region')) {
                                            return formatTextWithCodeTags('Add proper landmark elements or ARIA roles to structure the page content.');
                                          } else if (ruleId.includes('focus') || ruleId.includes('keyboard')) {
                                            return formatTextWithCodeTags('Ensure all interactive elements are keyboard accessible and have visible focus indicators.');
                                          } else {
                                            // Fallback to cleaned failure summary
                                            return formatTextWithCodeTags(cleanFailure);
                                          }
                                        })()}
                                      </div>
                                    </div>                                  )}
                                </div>
                              </div>
                            ))}

                            {violation.nodes.length > 5 && (
                              <div className="text-sm text-gray-500 italic text-center py-2">
                                ... and {violation.nodes.length - 5} more elements
                              </div>
                            )}
                          </div>
                        </div>
                      )}                      {/* LLM-generated recommendation */}
                      {violation.recommendation && (
                        <div className="mt-6">
                          <span className="text-base font-medium text-gray-700 mb-3">Recommended: </span>
                          <div className="mt-3">
                            {renderRecommendationContent(violation.recommendation)}
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
                  Try adjusting your severity filter selections above.                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AxeResults;
