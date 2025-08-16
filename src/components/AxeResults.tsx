/**
 * Display automated accessibility scan results from axe-core
 */

import React, { useState } from 'react';
import { html as beautifyHtml } from 'js-beautify';
import type { AxeViolation, SessionManifest, ComponentAccessibilityIssue } from '../types';
import BackToTopButton from './BackToTopButton';
import { isAuthUrl } from '../utils/authDetection';

interface AxeResultsProps {
  axeResults: AxeViolation[];
  manifest?: SessionManifest;
  screenReaderComponents?: ComponentAccessibilityIssue[];
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
 * Simple recommendation renderer for general accessibility guidance
 */
const renderRecommendationContent = (recommendation: string): React.ReactElement => {
  // Check if the recommendation contains a "Reference:" link that should be separated
  const referencePattern = /^(.*?)\s*Reference:\s*(https?:\/\/[^\s]+)$/s;
  const match = recommendation.match(referencePattern);
  
  if (match) {
    const [, mainText, url] = match;
    return (
      <div>
        <div className="text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
          {formatTextWithLinks(mainText.trim())}
        </div>
        <div className="mt-4">
          <span className="text-base font-medium text-gray-700">Deque reference: </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base text-info hover:text-matte-blue underline"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}
          >
            {url.includes('dequeuniversity.com') ? 
              // Extract rule name from deque URL (e.g., "landmark-one-main" from the URL)
              (() => {
                const match = url.match(/\/rules\/axe\/[^/]+\/([^?]+)/);
                const ruleName = match ? match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Axe Rule';
                return ruleName;
              })() 
              : 'WCAG Guideline'
            }
          </a>
        </div>
      </div>
    );
  }
  
  // For simple recommendations without "See:" links, just format with basic text and link handling
  return (
    <div className="text-base text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
      {formatTextWithLinks(recommendation)}
    </div>
  );
};

interface AxeResultsProps {
  axeResults: AxeViolation[];
  manifest?: SessionManifest;
}



const AxeResults: React.FC<AxeResultsProps> = ({ axeResults, manifest, screenReaderComponents = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showDuplicates, setShowDuplicates] = useState(false); // Default to hiding duplicates
  const [severityFilters, setSeverityFilters] = useState<Record<string, boolean>>({
    critical: true,
    serious: true,
    moderate: true,
    minor: true
  });

  // Create a more precise duplicate detection system
  // Match specific issue types rather than broad WCAG categories
  // Create a set of screen reader issue fingerprints using WCAG + element selector combinations
  const screenReaderIssueFingerprints = new Set(
    screenReaderComponents.flatMap(component => {
      const selector = component.selector;
      let wcagRule = component.wcagRule;
      
      // Only create fingerprint if we have both WCAG rule and selector
      if (!wcagRule || !selector) {
        console.log('⚠️ Skipping component - missing wcagRule or selector:', { wcagRule, selector });
        return [];
      }
      
      // Extract just the WCAG number from the full title (e.g., "4.1.2 Name, Role, Value" -> "4.1.2")
      const wcagNumber = wcagRule.split(' ')[0];
      
      // Create fingerprint combining WCAG number with element selector
      const fingerprint = `${wcagNumber}::${selector}`;
      console.log('🔍 Created screen reader fingerprint:', fingerprint);
      
      return [fingerprint];
    })
  );

  console.log('🔍 Total screen reader fingerprints created:', screenReaderIssueFingerprints.size);

  // Function to check if an axe violation is a duplicate of a screen reader issue
  const isDuplicateViolation = (violation: AxeViolation): boolean => {
    // Extract WCAG rule from violation (try different possible formats)
    let wcagRule = null;
    
    if (violation.wcagReference?.guideline) {
      wcagRule = violation.wcagReference.guideline;
    } else if (violation.tags) {
      // Look for WCAG tags in format like "wcag142" or "wcag241" 
      const wcagTag = violation.tags.find(tag => tag.startsWith('wcag') && tag.match(/wcag\d+/));
      if (wcagTag) {
        // Convert "wcag142" to "1.4.2" format
        const numbers = wcagTag.replace('wcag', '');
        if (numbers.length >= 3) {
          wcagRule = `${numbers[0]}.${numbers[1]}.${numbers.slice(2)}`;
        }
      }
    }
    
    if (!wcagRule) {
      console.log('⚠️ No WCAG rule found for violation:', violation.id);
      return false;
    }
    
    // Check each node's selector against screen reader fingerprints
    const isDupe = violation.nodes?.some(node => {
      // node.target is an array of selectors, try the first one
      const selector = node.target?.[0];
      if (!selector) return false;
      
      const fingerprint = `${wcagRule}::${selector}`;
      const match = screenReaderIssueFingerprints.has(fingerprint);
      
      if (match) {
        console.log(`🎯 Found exact duplicate: ${violation.id} (${fingerprint}) matches screen reader analysis`);
      }
      
      return match;
    }) || false;
    
    return isDupe;
  };

  // Debug logging
  console.log('🔍 Screen reader issue fingerprints:', Array.from(screenReaderIssueFingerprints));
  console.log('🔍 Available axe violations:', axeResults.map(v => ({ id: v.id, wcagRef: v.wcagReference, tags: v.tags })));
  console.log('🔍 showDuplicates state:', showDuplicates);

  // Test: Let's see what fingerprints axe violations would create
  axeResults.forEach(violation => {
    let wcagRule = null;
    
    if (violation.wcagReference?.guideline) {
      wcagRule = violation.wcagReference.guideline;
    } else if (violation.tags) {
      const wcagTag = violation.tags.find(tag => tag.startsWith('wcag') && tag.match(/wcag\d+/));
      if (wcagTag) {
        const numbers = wcagTag.replace('wcag', '');
        if (numbers.length >= 3) {
          wcagRule = `${numbers[0]}.${numbers[1]}.${numbers.slice(2)}`;
        }
      }
    }
    
    violation.nodes?.forEach(node => {
      const selector = node.target?.[0];
      if (wcagRule && selector) {
        const fingerprint = `${wcagRule}::${selector}`;
        console.log(`🧪 Axe violation ${violation.id} would create fingerprint:`, fingerprint);
        console.log(`🧪 Does it match screen reader?`, screenReaderIssueFingerprints.has(fingerprint));
      }
    });
  });

  // Filter violations based on duplicate status and user preference
  const getFilteredViolations = () => {
    const baseSeverityFilter = axeResults.filter(violation => 
      severityFilters[violation.impact] && 
      !isAuthViolation(violation)
    );

    console.log('🔍 Base filtered violations (after severity):', baseSeverityFilter.length);
    console.log('🔍 showDuplicates state:', showDuplicates);

    if (showDuplicates) {
      // Show all violations when toggle is on
      console.log('🔍 Showing all violations (toggle ON)');
      return baseSeverityFilter;
    } else {
      // Hide duplicates when toggle is off (default)
      console.log('🔍 Filtering duplicates (toggle OFF) - testing each violation:');
      const withoutDuplicates = baseSeverityFilter.filter(violation => {
        const isDupe = isDuplicateViolation(violation);
        console.log(`🔍 Violation ${violation.id} - isDuplicate: ${isDupe}`);
        if (isDupe) {
          console.log('✂️ FILTERING OUT duplicate:', violation.id);
        }
        return !isDupe;
      });
      console.log('🔍 After filtering duplicates:', withoutDuplicates.length, 'remaining out of', baseSeverityFilter.length);
      return withoutDuplicates;
    }
  };

  // Toggle individual item expansion
  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Helper to get the correct URL for a given step from manifest.stepDetails
  const getStepUrl = (step: number | string | undefined) => {
    if (!manifest || !Array.isArray(manifest.stepDetails) || step === undefined || step === null) {
      return 'Unknown';
    }
    return manifest.stepDetails.find((s: any) => s.step === step)?.url || 'Unknown';
  };

  // Helper to check if a violation is from an authentication step and should be filtered out
  const isAuthViolation = (violation: AxeViolation) => {
    // Use the violation's URL if available, otherwise get it from the step
    const url = violation.url || getStepUrl(violation.step);
    if (url === 'Unknown') return false;
    
    return isAuthUrl(url).isAuthStep;
  };

  // Filter violations by severity and exclude auth steps, then sort by step (capture order)
  const filteredViolations = getFilteredViolations().sort((a, b) => {
    // Sort by step in ascending order (capture order), fallback to 0 if missing
    const stepA = typeof a.step === 'number' ? a.step : 0;
    const stepB = typeof b.step === 'number' ? b.step : 0;
    return stepA - stepB; // Ascending order: step 1, step 2, step 3, etc.
  });

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

  // Helper to get URL for a violation
  const getViolationUrl = (violation: AxeViolation): string => {
    // First check if violation has a direct URL
    if (violation.url) return violation.url;
    
    // If violation has a step, try to find the corresponding URL in manifest
    if (violation.step != null && manifest?.stepDetails && Array.isArray(manifest.stepDetails)) {
      const stepDetail = manifest.stepDetails.find((s: any) => s.step === violation.step);
      if (stepDetail?.url) return stepDetail.url;
    }
    
    // Fallback to main manifest URL
    return manifest?.url || 'Unknown';
  };

  if (axeResults.length === 0) {
    return (
      <details className="mt-6 border-t border-gray-200 pt-6">
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card -mx-6">
      <div className="flex items-center justify-center py-5 px-4 relative">
        <h2 className="text-xl font-medium text-gray-900 text-center">
          Axe Accessibility Issues ({filteredViolations.length})
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-base text-slate hover:text-neutral-black underline absolute right-4"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Issue Count Summary - matching main analysis section styling */}
          {(() => {
            // Calculate counts from filtered violations (includes deduplication and severity filters)
            const counts = filteredViolations.reduce((acc, violation) => {
              acc[violation.impact] = (acc[violation.impact] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

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
                <p className="text-xs text-gray-500 text-center mb-12">Click boxes above to toggle filter</p>

                {/* Duplicate Issues Toggle */}
                {screenReaderIssueFingerprints.size > 0 && (
                  <div className="flex flex-col items-center mb-12 mt-8 pt-4 pb-4">
                    <div className="flex items-center mb-2">
                      <span className="mr-3 text-sm font-medium text-gray-700">Hide</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showDuplicates}
                          onChange={(e) => setShowDuplicates(e.target.checked)}
                          className="sr-only"
                        />
                        <div className="w-11 h-6 bg-blue-600 rounded-full transition-all">
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            showDuplicates ? 'translate-x-full' : 'translate-x-0'
                          }`}></div>
                        </div>
                      </label>
                      <span className="ml-3 text-sm font-medium text-gray-700">Show</span>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      <span className="font-bold">{showDuplicates ? 'Showing' : 'Hiding'}</span> duplicates of screen reader issues
                    </p>
                  </div>
                )}
              </>
            );
          })()}          {/* Violations List - matching main analysis section styling */}
          <div className="space-y-4">
            {filteredViolations.length > 0 ? (
              filteredViolations.map((violation, index) => {
                const itemId = `axe-violation-${violation.id}-${index}`;
                const isItemExpanded = expandedItems[itemId] || false;
                
                return (
                  <div key={`${violation.id}-${index}`} className="bg-white border border-gray-200 rounded overflow-hidden">
                    {/* Header Section - Always Visible */}
                    <button
                      onClick={() => toggleItemExpanded(itemId)}
                      className="w-full bg-gray-100 border-b border-gray-200 px-4 py-4 hover:bg-gray-150 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-base font-medium text-gray-900">{violation.help}</h4>
                        <div className="ml-4 text-right">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            violation.impact === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                            violation.impact === 'serious' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                            violation.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                            {violation.impact.toUpperCase()} IMPACT
                          </span>
                          
                          {/* Duplicate Badge */}
                          {isDuplicateViolation(violation) && (
                            <span className="ml-2 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                              DUPLICATE
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center flex-1">
                          <span>URL: </span>
                          {(() => {
                            const url = getViolationUrl(violation);
                            const displayUrl = url.length > 100 ? url.substring(0, 97) + '...' : url;
                            return (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={url}
                                className="px-1 py-0.5 bg-white text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded text-sm font-mono border border-gray-200 ml-1 underline cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {displayUrl}
                              </a>
                            );
                          })()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            axe accessibility
                          </span>
                          {/* Caret Icon */}
                          <svg 
                            className={`w-4 h-4 text-gray-500 transition-transform ${isItemExpanded ? 'transform rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2" 
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Expandable Content Section */}
                    {isItemExpanded && (
                      <div className="p-4">
                        <div className="space-y-6 text-left">                      <div>
                        <span className="text-base font-medium text-gray-700">Issue: </span>
                        <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                          {formatTextWithLinks(violation.description)}
                        </div>
                      </div>

                      {/* LLM-generated explanation (if available) */}
                      {violation.explanation && (
                        <div>
                          <span className="text-base font-medium text-gray-700">Explanation: </span>
                          <div className="text-base text-gray-600 mt-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                            {formatTextWithLinks(violation.explanation)}
                          </div>
                        </div>
                      )}

                      {/* WCAG Guideline - use LLM-resolved reference if available, otherwise show fallback */}
                      {violation.wcagReference ? (
                        <div>
                          <span className="text-base font-medium text-gray-700">WCAG Guideline: </span>
                          <a
                            href={violation.wcagReference.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-info hover:text-matte-blue underline"
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}
                          >
                            {violation.wcagReference.guideline} {violation.wcagReference.level} - {violation.wcagReference.title}
                          </a>
                        </div>
                      ) : null}

                      {/* Only show helpUrl if no WCAG reference was resolved - this keeps the deque reference as fallback */}                      {violation.nodes && violation.nodes.length > 0 && (
                        <div>
                          <span className="text-base font-medium text-gray-700 mb-3">Offending Code ({violation.nodes.length}): </span>                          <div className="mt-3 space-y-4">
                            {violation.nodes.map((node, nodeIndex) => (
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
                                            return formatTextWithLinks('Add an h1 element to provide a main heading for the page content.');
                                          } else if (ruleId.includes('color-contrast')) {
                                            return formatTextWithLinks('Increase the contrast ratio between text and background colors to meet WCAG standards.');
                                          } else if (ruleId.includes('alt-text') || ruleId.includes('image-alt')) {
                                            return formatTextWithLinks('Add descriptive alt text to images for screen reader users.');
                                          } else if (ruleId.includes('label') || ruleId.includes('form')) {
                                            return formatTextWithLinks('Associate form inputs with descriptive labels using the for/id attributes.');
                                          } else if (ruleId.includes('aria')) {
                                            return formatTextWithLinks('Fix ARIA attributes to ensure they are properly implemented and accessible.');
                                          } else if (ruleId.includes('landmark') || ruleId.includes('region')) {
                                            return formatTextWithLinks('Add proper landmark elements or ARIA roles to structure the page content.');
                                          } else if (ruleId.includes('focus') || ruleId.includes('keyboard')) {
                                            return formatTextWithLinks('Ensure all interactive elements are keyboard accessible and have visible focus indicators.');
                                          } else {
                                            // Fallback to cleaned failure summary
                                            return formatTextWithLinks(cleanFailure);
                                          }
                                        })()}
                                      </div>
                                    </div>                                  )}
                                </div>
                              </div>
                            ))}

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
                )}
                </div>
              );
            })
            ) : (
              // Check if we have issues but they're all hidden as duplicates
              (() => {
                const baseSeverityFilter = axeResults.filter(violation => 
                  severityFilters[violation.impact] && 
                  !isAuthViolation(violation)
                );
                
                const allAreDuplicates = baseSeverityFilter.length > 0 && 
                  !showDuplicates && 
                  baseSeverityFilter.every(violation => isDuplicateViolation(violation));
                
                if (allAreDuplicates) {
                  return (
                    <div className="text-center py-8">
                      <span className="text-gray-400 text-4xl">✨</span>
                      <h5 className="text-gray-600 font-medium mt-2">All Issues Hidden as Duplicates</h5>
                      <p className="text-gray-500 text-sm mt-1">
                        These issues were also found in the screen reader analysis. Toggle "Show" above to see them.
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-8">
                      <span className="text-gray-400 text-4xl">🔍</span>
                      <h5 className="text-gray-600 font-medium mt-2">No Issues Match Current Filter</h5>
                      <p className="text-gray-500 text-sm mt-1">
                        Try adjusting your severity filter selections above.
                      </p>
                    </div>
                  );
                }
              })()
            )}
          </div>
          
          {/* Back to Top Button */}
          <BackToTopButton />
        </div>
      )}
    </div>
  );
};

export default AxeResults;
