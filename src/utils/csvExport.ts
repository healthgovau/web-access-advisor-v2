/**
 * CSV export utilities for accessibility analysis reports
 * Exports both Screen Reader Analysis and Axe Results in a unified CSV format
 */

import type { AnalysisResult } from '../types';
import { isAuthUrl } from './authDetection';

interface CSVRow {
  url: string;
  violationCategory: string;
  issueSeverity: string;
  elementCSSReference: string;
  violationHeading: string;
  violationDescription: string;
}

/**
 * Clean text for CSV output - escape quotes and handle newlines
 */
function cleanTextForCSV(text: string): string {
  if (!text) return '';
  
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Handle common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Replace newlines with spaces for CSV compatibility
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    // Clean up excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escape text for CSV format (handle quotes and commas)
 */
function escapeCSVField(text: string): string {
  if (!text) return '';
  
  const cleaned = cleanTextForCSV(text);
  
  // If the field contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (cleaned.includes('"') || cleaned.includes(',') || cleaned.includes('\n')) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  
  return cleaned;
}

/**
 * Get URL for a specific step from the analysis manifest
 */
function getStepUrl(analysisResult: AnalysisResult, step?: number): string {
  if (!step || !analysisResult.manifest?.stepDetails) {
    return analysisResult.manifest?.url || 'Unknown';
  }
  
  const stepDetail = analysisResult.manifest.stepDetails.find(s => s.step === step);
  return stepDetail?.url || analysisResult.manifest.url || 'Unknown';
}

/**
 * Extract Screen Reader Analysis issues as CSV rows
 */
function extractScreenReaderIssues(analysisResult: AnalysisResult): CSVRow[] {
  const issues: CSVRow[] = [];
  
  if (!analysisResult.analysis?.components) {
    return issues;
  }
  
  for (const component of analysisResult.analysis.components) {
    // Skip authentication-related issues
    const url = getStepUrl(analysisResult, component.step);
    if (isAuthUrl(url).isAuthStep) {
      continue;
    }
    
    issues.push({
      url: url,
      violationCategory: 'Screen Reader Analysis',
      issueSeverity: component.impact.toUpperCase(),
      elementCSSReference: component.selector || 'Not specified',
      violationHeading: `${component.componentName} (${component.impact.toUpperCase()})`,
      violationDescription: `${component.issue} ${component.explanation}`
    });
  }
  
  return issues;
}

/**
 * Extract Axe Results as CSV rows
 */
function extractAxeIssues(analysisResult: AnalysisResult): CSVRow[] {
  const issues: CSVRow[] = [];
  
  if (!analysisResult.axeResults) {
    return issues;
  }
  
  for (const violation of analysisResult.axeResults) {
    // Skip authentication-related issues
    const url = getStepUrl(analysisResult, violation.step);
    if (isAuthUrl(url).isAuthStep) {
      continue;
    }
    
    // Create one row per affected element (node)
    for (const node of violation.nodes || []) {
      const cssSelector = Array.isArray(node.target) ? node.target.join(' > ') : node.target || 'Not specified';
      
      issues.push({
        url: url,
        violationCategory: 'Axe Scan',
        issueSeverity: violation.impact.toUpperCase(),
        elementCSSReference: cssSelector,
        violationHeading: `${violation.id} (${violation.impact.toUpperCase()})`,
        violationDescription: `${violation.help} ${violation.description || ''} ${node.failureSummary || ''}`.trim()
      });
    }
  }
  
  return issues;
}

/**
 * Convert CSV rows to CSV content string
 */
function convertToCSV(rows: CSVRow[]): string {
  if (rows.length === 0) {
    return 'url,violation_category,issue_severity,element_css_reference,violation_heading,violation_description\n';
  }
  
  // CSV header
  const headers = [
    'url',
    'violation_category',
    'issue_severity',
    'element_css_reference',
    'violation_heading',
    'violation_description'
  ];
  
  // Create CSV content
  const csvLines = [
    headers.join(','), // Header row
    ...rows.map(row => [
      escapeCSVField(row.url),
      escapeCSVField(row.violationCategory),
      escapeCSVField(row.issueSeverity),
      escapeCSVField(row.elementCSSReference),
      escapeCSVField(row.violationHeading),
      escapeCSVField(row.violationDescription)
    ].join(','))
  ];
  
  return csvLines.join('\n');
}

/**
 * Generate filename for CSV export
 */
function generateCSVFilename(analysisResult: AnalysisResult): string {
  const baseUrl = analysisResult.manifest?.url || 'accessibility-analysis';
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  
  // Extract domain from URL for filename
  let domain = 'unknown-site';
  try {
    const url = new URL(baseUrl);
    domain = url.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9-]/g, '-');
  } catch {
    // If URL parsing fails, use a sanitized version of the original
    domain = baseUrl.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 30);
  }
  
  return `accessibility-analysis-${domain}-${timestamp}.csv`;
}

/**
 * Export accessibility analysis results to CSV format
 */
export async function exportAnalysisToCSV(
  analysisResult: AnalysisResult
): Promise<void> {
  try {
    console.log('🔄 Starting CSV export...');
    
    // Extract issues from both sources
    const screenReaderIssues = extractScreenReaderIssues(analysisResult);
    const axeIssues = extractAxeIssues(analysisResult);
    
    // Combine all issues
    const allIssues = [...screenReaderIssues, ...axeIssues];
    
    console.log(`📊 CSV Export Summary:
- Screen Reader Issues: ${screenReaderIssues.length}
- Axe Issues: ${axeIssues.length}  
- Total Issues: ${allIssues.length}`);
    
    // Convert to CSV format
    const csvContent = convertToCSV(allIssues);
    const filename = generateCSVFilename(analysisResult);
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      // Feature detection for download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers
      const url = URL.createObjectURL(blob);
      window.open(url);
      URL.revokeObjectURL(url);
    }
    
    console.log(`✅ CSV export completed: ${filename}`);
    
  } catch (error) {
    console.error('❌ CSV export failed:', error);
    throw new Error(`CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get CSV export statistics without performing the export
 */
export function getCSVExportStats(analysisResult: AnalysisResult): {
  screenReaderIssues: number;
  axeIssues: number;
  totalIssues: number;
  hasData: boolean;
} {
  const screenReaderIssues = extractScreenReaderIssues(analysisResult);
  const axeIssues = extractAxeIssues(analysisResult);
  const totalIssues = screenReaderIssues.length + axeIssues.length;
  
  return {
    screenReaderIssues: screenReaderIssues.length,
    axeIssues: axeIssues.length,
    totalIssues,
    hasData: totalIssues > 0
  };
}
