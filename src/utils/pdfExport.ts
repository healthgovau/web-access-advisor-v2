/**
 * PDF export utilities for accessibility analysis reports
 * 
 * IMPORTANT NOTE ABOUT PDF LINKS:
 * - PDF files cannot force links to open in "new tabs" - this is a fundamental limitation of the PDF format
 * - Link behavior (new tab, same window, etc.) is controlled by the user's PDF viewer settings, not our code
 * - Different PDF viewers (Chrome, Adobe Reader, Firefox, etc.) handle links differently
 * - This is not a bug in our code - it's how PDFs work
 */

import jsPDF from 'jspdf';
import type { AnalysisResult } from '../types';

/**
 * Clean text for PDF output - preserve backticks and important content
 */
function cleanTextForPDF(text: string): string {
  if (!text) return '';
  
  // More conservative approach - preserve backticks and important formatting
  let cleaned = text
    // First, handle common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    
    // Handle numeric entities more carefully
    .replace(/&#(\d+);/g, (_, num) => {
      const code = parseInt(num, 10);
      // Only convert safe printable characters
      if (code >= 32 && code <= 126) return String.fromCharCode(code);
      if (code === 160) return ' '; // Non-breaking space
      // For unknown codes, return empty string to remove them
      return '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      // Only convert safe printable characters
      if (code >= 32 && code <= 126) return String.fromCharCode(code);
      if (code === 160) return ' '; // Non-breaking space
      // For unknown codes, return empty string to remove them
      return '';
    })
    
    // Remove HTML tags BUT preserve backtick content
    .replace(/<[^>]*>/g, '')
    
    // Convert smart quotes and dashes to ASCII
    .replace(/[\u2018\u2019]/g, "'")  // Smart quotes
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes  
    .replace(/[\u2013\u2014]/g, '-')  // En/em dashes
    .replace(/[\u2026]/g, '...')      // Ellipsis
    .replace(/[\u00A0]/g, ' ')        // Non-breaking space
    
    // Remove problematic Unicode ranges that cause encoding artifacts
    .replace(/[\u0080-\u009F]/g, '')   // C1 control characters
    .replace(/[\u00AD]/g, '')          // Soft hyphen
    .replace(/[\uFFF0-\uFFFF]/g, '')   // Specials block
    .replace(/[\uFFFE\uFFFF]/g, '')    // Non-characters
    
    // More selective character filtering - preserve backticks and common symbols
    .replace(/[^\x20-\x7E\u00A1-\u00FF`]/g, '')
    
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
    
  return cleaned;
}

/**
 * Add text with clickable links to PDF
 * Note: PDFs cannot force links to open in "new tabs" - this is controlled by the user's PDF viewer settings.
 */
function addTextWithLinks(pdf: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  // Clean the text first to remove encoding artifacts
  const cleanedText = cleanTextForPDF(text);
  
  let currentY = y;
  const lines = pdf.splitTextToSize(cleanedText, maxWidth);
  
  lines.forEach((line: string) => {
    let currentX = x;
    let remainingText = line;
    
    // Process URLs first
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    let urlMatch;
    let lastIndex = 0;
    
    while ((urlMatch = urlRegex.exec(remainingText)) !== null) {
      // Add text before URL
      const beforeText = remainingText.substring(lastIndex, urlMatch.index);
      if (beforeText) {
        // Just add text without trying to parse WCAG patterns
        currentX = addWcagLinks(pdf, beforeText, currentX, currentY);
      }
      
      // Add the URL as clickable link
      const url = urlMatch[0];
      pdf.setTextColor(0, 0, 255); // Blue color for links
      pdf.text(url, currentX, currentY);
      
      const textWidth = pdf.getTextWidth(url);
      // Note: PDF link behavior is controlled by the user's PDF viewer, not our code
      pdf.link(currentX, currentY - 3, textWidth, 4, { url: url });
      
      currentX += textWidth;
      pdf.setTextColor(0, 0, 0); // Reset to black
      
      lastIndex = urlMatch.index + urlMatch[0].length;
    }
    
    // Add remaining text after last URL
    const remainingAfterUrls = remainingText.substring(lastIndex);
    if (remainingAfterUrls) {
      currentX = addWcagLinks(pdf, remainingAfterUrls, currentX, currentY);
    }
    
    currentY += 4; // Line height
  });
  
  return currentY;
}

/**
 * Add a code block with proper text wrapping and overflow handling
 */
function addCodeBlock(pdf: jsPDF, code: string, x: number, y: number, maxWidth: number, backgroundColor: [number, number, number], borderColor: [number, number, number]): number {
  if (!code.trim()) return y;
  
  // Calculate available width for code (accounting for padding)
  const codeAreaWidth = maxWidth - 16; // 8px padding on each side
  
  // Split text with proper width constraint for courier font
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8); // Slightly smaller font to fit better
  const codeLines = pdf.splitTextToSize(code, codeAreaWidth);
  const codeHeight = Math.max(codeLines.length * 3.5 + 8, 15); // Tighter line spacing
  
  // Code background with border
  pdf.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y - 2, maxWidth, codeHeight, 'FD');
  
  // Add code text with proper positioning
  pdf.text(codeLines, x + 8, y + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9); // Reset to default size
  
  return y + codeHeight + 5;
}

/**
 * Add text with basic WCAG link detection - only for clear WCAG patterns
 * Note: PDF links cannot open in "new tabs" - this is a fundamental limitation of the PDF format.
 */
function addWcagLinks(pdf: jsPDF, text: string, x: number, y: number): number {
  let currentX = x;
  
  // Very restrictive regex that only matches explicit WCAG references:
  // "WCAG 4.1.2" or "WCAG guideline 4.1.2" or "4.1.2 Success Criterion"
  // Must have "WCAG" prefix OR "Success Criterion" suffix to avoid false matches
  const wcagRegex = /\b(?:WCAG\s+(?:guideline\s+)?(\d+\.\d+(?:\.\d+)?)|(\d+\.\d+(?:\.\d+)?)\s+Success\s+Criterion)\b/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = wcagRegex.exec(text)) !== null) {
    // Add text before WCAG reference
    const beforeText = text.substring(lastIndex, match.index);
    if (beforeText) {
      pdf.text(beforeText, currentX, y);
      currentX += pdf.getTextWidth(beforeText);
    }
    
    const fullMatch = match[0];
    const guidelineNumber = match[1] || match[2]; // Either capture group
    
    // Create WCAG link for common guidelines only
    const commonGuidelines = ['1.1.1', '1.2.1', '1.3.1', '1.4.1', '1.4.3', '2.1.1', '2.4.1', '2.4.2', '2.4.3', '2.4.4', '2.4.6', '3.1.1', '3.2.1', '3.3.1', '3.3.2', '4.1.1', '4.1.2', '4.1.3'];
    
    if (guidelineNumber && commonGuidelines.includes(guidelineNumber)) {
      const wcagUrl = `https://www.w3.org/WAI/WCAG21/Understanding/${guidelineNumber.replace(/\./g, '-')}.html`;
      pdf.setTextColor(0, 0, 255); // Blue color for links
      pdf.text(fullMatch, currentX, y);
      
      const textWidth = pdf.getTextWidth(fullMatch);
      pdf.link(currentX, y - 3, textWidth, 4, { url: wcagUrl });
      
      currentX += textWidth;
      pdf.setTextColor(0, 0, 0); // Reset to black
    } else {
      // Not a valid WCAG reference - just add as regular text
      pdf.text(fullMatch, currentX, y);
      currentX += pdf.getTextWidth(fullMatch);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last WCAG reference
  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    pdf.text(remainingText, currentX, y);
    currentX += pdf.getTextWidth(remainingText);
  }
  
  return currentX;
}

/**
 * Add a styled header with background color
 */
function addStyledHeader(pdf: jsPDF, text: string, y: number, margin: number, pageWidth: number, size: number = 16): number {
  // Add background rectangle
  pdf.setFillColor(45, 55, 72); // Dark gray background
  pdf.rect(margin, y - 5, pageWidth - 2 * margin, size + 4, 'F');
  
  // Add white text
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(size);
  pdf.setFont('helvetica', 'bold');
  pdf.text(text, margin + 5, y + size - 8);
  
  // Reset to black text
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  
  return y + size + 8;
}

/**
 * Add a section divider line
 */
function addSectionDivider(pdf: jsPDF, y: number, margin: number, pageWidth: number): number {
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  return y + 8;
}

/**
 * Get impact level styling without emoji symbols
 */
function getImpactStyling(impact: string): { color: [number, number, number], text: string } {
  switch (impact.toLowerCase()) {
    case 'critical':
      return { color: [220, 38, 127], text: 'CRITICAL' };
    case 'serious':
      return { color: [234, 88, 12], text: 'SERIOUS' };
    case 'moderate':
      return { color: [202, 138, 4], text: 'MODERATE' };
    case 'minor':
      return { color: [37, 99, 235], text: 'MINOR' };
    default:
      return { color: [107, 114, 128], text: 'UNKNOWN' };
  }
}

/**
 * Add a professional summary table
 */
function addSummaryTable(pdf: jsPDF, counts: Record<string, number>, title: string, y: number, margin: number, pageWidth: number): number {
  const tableWidth = pageWidth - 2 * margin;
  const cellHeight = 8;
  let currentY = y;

  // Table header
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, currentY, tableWidth, cellHeight, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(margin, currentY, tableWidth, cellHeight, 'S');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(title, margin + 5, currentY + 6);
  currentY += cellHeight;

  // Table rows
  ['critical', 'serious', 'moderate', 'minor'].forEach((impact, index) => {
    const styling = getImpactStyling(impact);
    const count = counts[impact] || 0;
    
    // Alternating row colors
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, currentY, tableWidth, cellHeight, 'F');
    }
    
    pdf.rect(margin, currentY, tableWidth, cellHeight, 'S');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(styling.text, margin + 5, currentY + 6);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(count.toString(), pageWidth - margin - 15, currentY + 6);
    
    currentY += cellHeight;
  });
  return currentY + 5;
}

/**
 * Format action description for PDF display
 */
function getActionDescription(action: any): string {
  if (!action || !action.type) return 'Unknown action';
  
  switch (action.type) {
    case 'navigate':
      // Clean the URL to prevent duplication
      let url = action.url || 'Unknown URL';
      // Remove duplicate protocol/domain if present
      url = url.replace(/^(https?:\/\/[^\/]+)\1/, '$1');
      return `Navigated to: ${url}`;
    case 'click':
      return `Clicked on element${action.selector ? `: ${action.selector}` : ''}`;
    case 'type':
      return `Typed text${action.text ? `: "${action.text}"` : ''}${action.selector ? ` in ${action.selector}` : ''}`;
    case 'scroll':
      return 'Scrolled page';
    case 'keydown':
      return `Pressed key: ${action.key || 'Unknown key'}`;
    case 'focus':
      return `Focused on element${action.selector ? `: ${action.selector}` : ''}`;
    case 'blur':
      return `Lost focus on element${action.selector ? `: ${action.selector}` : ''}`;
    default:
      return `${action.type} action`;
  }
}

/**
 * Generate comprehensive PDF from analysis results
 */
export async function exportAnalysisToPDF(
  analysisData: AnalysisResult,
  actions: any[] = []
): Promise<void> {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // ===== COVER PAGE =====
    // Main title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(45, 55, 72);
    const titleLines = pdf.splitTextToSize('Web Accessibility Analysis Report', pageWidth - 2 * margin);
    pdf.text(titleLines, margin, currentY);
    currentY += titleLines.length * 12 + 20;

    // Report metadata box
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    const metadataBoxHeight = 50;
    pdf.rect(margin, currentY, pageWidth - 2 * margin, metadataBoxHeight, 'FD');
      pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
      const metadata = [
      `Session ID: ${cleanTextForPDF(analysisData.sessionId)}`,
      `Website URL: ${cleanTextForPDF(analysisData.manifest?.url || 'Not specified')}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Snapshots Analyzed: ${analysisData.snapshotCount}`,
      `Total Issues Found: ${(analysisData.analysis?.components?.length || 0) + (analysisData.axeResults?.length || 0)}`
    ];
    
    metadata.forEach((line, index) => {
      pdf.text(line, margin + 5, currentY + 8 + (index * 8));
    });
    
    currentY += metadataBoxHeight + 20;

    // Executive Summary
    if (analysisData.analysis?.components || analysisData.axeResults) {
      currentY = addStyledHeader(pdf, 'SUMMARY', currentY, margin, pageWidth, 14);
      
      let totalIssues = 0;
      let criticalCount = 0;
      
      if (analysisData.analysis?.components) {
        totalIssues += analysisData.analysis.components.length;
        criticalCount += analysisData.analysis.components.filter(c => c.impact === 'critical').length;
      }
      
      if (analysisData.axeResults) {
        totalIssues += analysisData.axeResults.length;
        criticalCount += analysisData.axeResults.filter(v => v.impact === 'critical').length;
      }      pdf.setFontSize(11);
      
      // Key metrics box
      pdf.setDrawColor(59, 130, 246);
      pdf.setFillColor(239, 246, 255);
      const metricsHeight = 25;
      pdf.rect(margin, currentY, pageWidth - 2 * margin, metricsHeight, 'FD');
        pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 64, 175);
      pdf.text('KEY FINDINGS', margin + 10, currentY + 8);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Total Issues: ${totalIssues}  |  Critical: ${criticalCount}`, margin + 10, currentY + 18);
      
      currentY += metricsHeight + 15;
      
      // Summary content with better formatting
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(185, 28, 28);
      pdf.text('PRIORITY ACTIONS:', margin, currentY);
      currentY += 8;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      const priorityText = criticalCount > 0 
        ? `• ${criticalCount} critical issues require immediate attention for WCAG compliance`
        : '• No critical issues found - maintain current accessibility standards';
      
      const lines = pdf.splitTextToSize(priorityText, pageWidth - 2 * margin - 10);
      pdf.text(lines, margin + 5, currentY);
      currentY += lines.length * 6 + 10;
      
      // Methodology section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(34, 197, 94);
      pdf.text('ANALYSIS APPROACH:', margin, currentY);
      currentY += 8;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      const summaryText = [
        `• AI-powered screen reader analysis identified user experience barriers`,
        `• Automated axe-core scanning provided comprehensive technical coverage`,
        `• Combined approach delivers both usability and compliance insights`
      ];
      
      summaryText.forEach(line => {
        const lines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        pdf.text(lines, margin, currentY);
        currentY += lines.length * 6 + 3;
      });      
      currentY += 15;
    }

    // ===== RECORDED ACTIONS =====
    if (actions && actions.length > 0) {
      currentY = addStyledHeader(pdf, `RECORDED ACTIONS (${actions.length})`, currentY, margin, pageWidth);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text(`Session ID: ${analysisData.sessionId}`, margin, currentY);
      currentY += 10;
      
      pdf.setFontSize(10);
      pdf.text('User interactions captured during the accessibility analysis session:', margin, currentY);
      currentY += 10;      actions.forEach((action, index) => {
        if (currentY > pageHeight - 30) {
          pdf.addPage();
          currentY = margin;
        }
        
        const actionText = cleanTextForPDF(getActionDescription(action));
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        // Use addTextWithLinks to make URLs clickable
        const indexText = `${index + 1}. `;
        pdf.text(indexText, margin + 5, currentY);
        const indexWidth = pdf.getTextWidth(indexText);
        currentY = addTextWithLinks(pdf, actionText, margin + 5 + indexWidth, currentY, pageWidth - 2 * margin - indexWidth);
        currentY += 2;
      });
      
      currentY += 15;
    }    // ===== SCREEN READER ACCESSIBILITY ISSUES =====
    if (analysisData.analysis?.components && analysisData.analysis.components.length > 0) {
      currentY = addStyledHeader(pdf, `SCREEN READER ACCESSIBILITY ISSUES (${analysisData.analysis.components.length})`, currentY, margin, pageWidth);
      
      // Summary table
      const llmCounts = analysisData.analysis.components.reduce((acc, component) => {
        acc[component.impact] = (acc[component.impact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      currentY = addSummaryTable(pdf, llmCounts, 'AI Analysis Summary', currentY, margin, pageWidth);
      currentY += 10;

      // Detailed findings
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Detailed Analysis', margin, currentY);
      currentY += 10;

      analysisData.analysis.components.forEach((component, index) => {
        // Check if we need a new page
        if (currentY > pageHeight - 80) {
          pdf.addPage();
          currentY = margin;
        }        // Issue header with styling
        const styling = getImpactStyling(component.impact);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(styling.color[0], styling.color[1], styling.color[2]);
        pdf.text(`${index + 1}. ${component.componentName}`, margin, currentY);
        
        // Keep impact label colored
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(styling.color[0], styling.color[1], styling.color[2]);
        pdf.text(styling.text, pageWidth - margin - 30, currentY);
        
        // Reset to black for subsequent content
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        currentY += 10;

        // Issue details in structured format
        const sections = [
          { label: 'ISSUE', content: component.issue },
          { label: 'EXPLANATION', content: component.explanation }
        ];        sections.forEach(section => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text(section.label + ':', margin, currentY);
          currentY += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          currentY = addTextWithLinks(pdf, cleanTextForPDF(section.content), margin, currentY, pageWidth - 2 * margin);
          currentY += 5;
        });        // Code sections - show whatever the LLM provided with appropriate formatting
        if (component.relevantHtml) {
          // For code display, we want to preserve HTML tags, so use minimal cleaning (same as Axe section)
          const rawHtml = component.relevantHtml || '';
          const cleanCode = rawHtml
            // Only handle basic HTML entities but preserve tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            // Remove only problematic characters that break PDF encoding
            .replace(/[\u0080-\u009F]/g, '')   // C1 control characters
            .replace(/[\u00AD]/g, '')          // Soft hyphen
            .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, ' ') // Non-printable chars to space
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanCode.trim()) {
            // Check if this looks like actual HTML markup
            const isActualHtml = /<\w+[^>]*>/.test(component.relevantHtml) || 
                                /&lt;\w+[^&]*&gt;/.test(component.relevantHtml);
            
            // Check if this is just descriptive text with backticks (not actual code)
            const isDescriptiveText = /^The `\w+`/.test(cleanCode.trim()) ||
                                     /`\w+` with the/.test(cleanCode) ||
                                     /contains `\w+`/.test(cleanCode);
              if (isActualHtml && !isDescriptiveText) {
              // Show as formatted code
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9);
              pdf.text('OFFENDING CODE:', margin, currentY);
              currentY += 5;
              
              currentY = addCodeBlock(pdf, cleanCode, margin, currentY, pageWidth - 2 * margin, [254, 242, 242], [220, 38, 127]);
            } else {
              // Show as regular content description
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9);
              pdf.text('AFFECTED ELEMENT:', margin, currentY);
              currentY += 5;
              
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              currentY = addTextWithLinks(pdf, cleanCode, margin, currentY, pageWidth - 2 * margin);
              currentY += 5;
            }
          }
        }        if (component.correctedCode) {
          // For code display, we want to preserve HTML tags, so use minimal cleaning (same as Axe section)
          const rawSolution = component.correctedCode || '';
          const cleanSolution = rawSolution
            // Only handle basic HTML entities but preserve tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            // Remove only problematic characters that break PDF encoding
            .replace(/[\u0080-\u009F]/g, '')   // C1 control characters
            .replace(/[\u00AD]/g, '')          // Soft hyphen
            .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, ' ') // Non-printable chars to space
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanSolution.trim()) {
            // Check if this looks like actual HTML markup
            const isActualHtml = /<\w+[^>]*>/.test(component.correctedCode) ||
                                /&lt;\w+[^&]*&gt;/.test(component.correctedCode);
            
            // Check if this is descriptive text rather than code
            const isDescriptiveText = /^The `\w+`/.test(cleanSolution.trim()) ||
                                     /`\w+` with the/.test(cleanSolution) ||
                                     /contains `\w+`/.test(cleanSolution);
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.text('RECOMMENDED SOLUTION:', margin, currentY);
            currentY += 5;
            
            if (component.codeChangeSummary) {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              currentY = addTextWithLinks(pdf, cleanTextForPDF(component.codeChangeSummary), margin, currentY, pageWidth - 2 * margin);
              currentY += 3;
            }            if (isActualHtml && !isDescriptiveText) {
              // Show as formatted code
              currentY = addCodeBlock(pdf, cleanSolution, margin, currentY, pageWidth - 2 * margin, [240, 253, 244], [34, 197, 94]);
            } else {
              // Show as regular text description
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              currentY = addTextWithLinks(pdf, cleanSolution, margin, currentY, pageWidth - 2 * margin);
              currentY += 5;
            }
          }
        }        // WCAG Reference - use direct URL from LLM if available
        if (component.wcagRule || component.wcagUrl) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('WCAG GUIDELINE:', margin, currentY);
          currentY += 5;
          
          pdf.setFont('helvetica', 'normal');
          if (component.wcagUrl) {
            // Use the direct URL provided by the LLM
            pdf.setTextColor(0, 0, 255); // Blue color for links
            const displayText = component.wcagRule || component.wcagUrl;
            pdf.text(displayText, margin, currentY);
            
            const textWidth = pdf.getTextWidth(displayText);
            pdf.link(margin, currentY - 3, textWidth, 4, { url: component.wcagUrl });
            pdf.setTextColor(0, 0, 0); // Reset to black
            currentY += 8;
          } else {
            // Fallback to text with WCAG pattern matching
            currentY = addTextWithLinks(pdf, component.wcagRule, margin, currentY, pageWidth - 2 * margin);
            currentY += 3;
          }
        }

        // URL for this issue
        const issueUrl = component.url || (component.step != null && analysisData.manifest?.url ? analysisData.manifest.url : analysisData.manifest?.url || 'Unknown');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text('URL:', margin, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(issueUrl, margin + 15, currentY);
        currentY += 5;

        currentY = addSectionDivider(pdf, currentY, margin, pageWidth);
      });
    }

    // ===== AUTOMATED ACCESSIBILITY SCAN (AXE RESULTS) =====
    if (analysisData.axeResults && analysisData.axeResults.length > 0) {
      // New page for axe results
      pdf.addPage();
      currentY = margin;
      
      currentY = addStyledHeader(pdf, `Axe Accessibility Issues (${analysisData.axeResults.length})`, currentY, margin, pageWidth);

      // Axe summary table
      const axeCounts = analysisData.axeResults.reduce((acc, violation) => {
        acc[violation.impact] = (acc[violation.impact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      currentY = addSummaryTable(pdf, axeCounts, 'Automated Scan Summary', currentY, margin, pageWidth);
      currentY += 10;

      // Detailed axe findings
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Detailed Scan Results', margin, currentY);
      currentY += 10;

      analysisData.axeResults.forEach((violation, index) => {
        // Check if we need a new page
        if (currentY > pageHeight - 80) {
          pdf.addPage();
          currentY = margin;
        }        // Violation header
        const styling = getImpactStyling(violation.impact);
        
        // Calculate available width for heading (leave space for severity label)
        const severityWidth = pdf.getTextWidth(styling.text) + 10; // Add some padding
        const maxHeadingWidth = pageWidth - 2 * margin - severityWidth;
          // Truncate heading if needed to avoid collision with severity label
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        const fullHeading = `${index + 1}. ${violation.help}`;
        const truncatedHeading = pdf.splitTextToSize(fullHeading, maxHeadingWidth)[0] || fullHeading;
        
        // Add ellipses if the heading was truncated
        const displayHeading = truncatedHeading.length < fullHeading.length ? 
          truncatedHeading.replace(/\s+$/, '') + '...' : truncatedHeading;
          // Violation title and severity on same line
        pdf.setTextColor(styling.color[0], styling.color[1], styling.color[2]);
        pdf.text(displayHeading, margin, currentY);
        
        // Severity label on same line, right-aligned
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(styling.text, pageWidth - margin - severityWidth + 10, currentY);
        
        // Reset to black for subsequent content
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        currentY += 8;        // Rule ID
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text('RULE ID:', margin, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(violation.id, margin + 20, currentY);
        currentY += 5;// Description
        pdf.setFont('helvetica', 'bold');
        pdf.text('DESCRIPTION:', margin, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        currentY = addTextWithLinks(pdf, cleanTextForPDF(violation.description), margin, currentY, pageWidth - 2 * margin);
        currentY += 8;        // WCAG Guideline (matching screen reader section format)
        if (violation.helpUrl) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('WCAG GUIDELINE:', margin, currentY);
          currentY += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 255); // Blue color for links
          pdf.text(violation.helpUrl, margin, currentY);
          
          const textWidth = pdf.getTextWidth(violation.helpUrl);
          // Use the actual helpUrl directly from axe-core - don't parse it for WCAG patterns
          pdf.link(margin, currentY - 3, textWidth, 4, { url: violation.helpUrl });
          pdf.setTextColor(0, 0, 0); // Reset to black
          currentY += 8;
        }        // Affected elements with better formatting
        if (violation.nodes && violation.nodes.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`OFFENDING CODE (${violation.nodes.length}):`, margin, currentY);
          currentY += 8;violation.nodes.forEach((node) => {
            // For code display, we want to preserve HTML tags, so use minimal cleaning
            const rawHtml = node.html || '';
            const cleanHtml = rawHtml
              // Only handle basic HTML entities but preserve tags
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&nbsp;/g, ' ')
              // Remove only problematic characters that break PDF encoding
              .replace(/[\u0080-\u009F]/g, '')   // C1 control characters
              .replace(/[\u00AD]/g, '')          // Soft hyphen
              .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, ' ') // Non-printable chars to space
              .replace(/\s+/g, ' ')
              .trim();
              
            // Show code directly without "Element X:" label
            if (cleanHtml) {
              currentY = addCodeBlock(pdf, cleanHtml, margin, currentY, pageWidth - 2 * margin, [254, 242, 242], [220, 38, 127]);
            }
          });
          if (violation.nodes.length > 5) {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(9);
            pdf.text(`... and ${violation.nodes.length - 5} more elements`, margin + 5, currentY);
            currentY += 8;
          }
        }        // LLM-generated recommendation
        if (violation.recommendation) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('RECOMMENDED:', margin, currentY);
          currentY += 5;
          
          // Parse and render recommendation with proper formatting - check for "See:" links
          const recommendation = cleanTextForPDF(violation.recommendation);
          const seePattern = /^(.*?)\s*See:\s*(https?:\/\/[^\s]+)$/s;
          const match = recommendation.match(seePattern);
          
          if (match) {
            const [, mainText, url] = match;
            
            // Render main recommendation text
            const paragraphs = mainText.trim().split(/\n\s*\n/);
            
            paragraphs.forEach(paragraph => {
              const trimmedParagraph = paragraph.trim();
              if (!trimmedParagraph) return;
              
              // Handle different paragraph types (same as before)
              if (trimmedParagraph.toLowerCase().includes('code example:')) {
                const lines = trimmedParagraph.split('\n');
                const codeExampleIndex = lines.findIndex(line => line.toLowerCase().includes('code example:'));
                
                if (codeExampleIndex !== -1) {
                  const beforeCode = lines.slice(0, codeExampleIndex).join('\n').trim();
                  const codeContent = lines.slice(codeExampleIndex + 1).join('\n').trim();
                    if (beforeCode) {
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    currentY = addTextWithLinks(pdf, beforeCode, margin, currentY, pageWidth - 2 * margin);
                    currentY += 3;
                  }
                    if (codeContent) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(9);
                    pdf.text('Code Example:', margin, currentY);
                    currentY += 5;
                      
                    currentY = addCodeBlock(pdf, cleanTextForPDF(codeContent), margin, currentY, pageWidth - 2 * margin, [248, 249, 250], [156, 163, 175]);
                  }}
              }
              else if (/^Testing:/i.test(trimmedParagraph)) {
                const headingContent = trimmedParagraph.replace(/^Testing:\s*/i, '').trim();
                
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                pdf.text('Testing:', margin, currentY);
                currentY += 4;
                
                if (headingContent) {
                  pdf.setFont('helvetica', 'normal');
                  pdf.setFontSize(9);
                  currentY = addTextWithLinks(pdf, headingContent, margin, currentY, pageWidth - 2 * margin);
                  currentY += 3;                }
              }
              else {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                currentY = addTextWithLinks(pdf, trimmedParagraph, margin, currentY, pageWidth - 2 * margin);
                currentY += 3;
              }
            });
              // Add Reference section (matching screen reader section format)
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.text('REFERENCE:', margin, currentY);
            currentY += 5;
            
            pdf.setFont('helvetica', 'normal');
            // Show the actual URL as clickable link instead of generic text
            currentY = addTextWithLinks(pdf, url, margin, currentY, pageWidth - 2 * margin);
            currentY += 3;
            
          } else {
            // No "See:" link found, render as before
            const paragraphs = recommendation.split(/\n\s*\n/);
            
            paragraphs.forEach(paragraph => {
              const trimmedParagraph = paragraph.trim();
              if (!trimmedParagraph) return;
            
            // Check for code examples - only show code box if there's actual code content
            if (trimmedParagraph.toLowerCase().includes('code example:')) {
              const lines = trimmedParagraph.split('\n');
              const codeExampleIndex = lines.findIndex(line => line.toLowerCase().includes('code example:'));
              
              if (codeExampleIndex !== -1) {
                const beforeCode = lines.slice(0, codeExampleIndex).join('\n').trim();
                const codeContent = lines.slice(codeExampleIndex + 1).join('\n').trim();
                  // Add text before code if present
                if (beforeCode) {
                  pdf.setFont('helvetica', 'normal');
                  pdf.setFontSize(9);
                  currentY = addTextWithLinks(pdf, beforeCode, margin, currentY, pageWidth - 2 * margin);
                  currentY += 3;
                }
                  // Only add code box if there's actual code content
                if (codeContent) {
                  // Code example header
                  pdf.setFont('helvetica', 'bold');
                  pdf.setFontSize(9);
                  pdf.text('Code Example:', margin, currentY);
                  currentY += 5;
                  
                  currentY = addCodeBlock(pdf, cleanTextForPDF(codeContent), margin, currentY, pageWidth - 2 * margin, [248, 249, 250], [156, 163, 175]);
                }}
            }
            // Check if this is a section heading (Testing:, etc.)
            else if (/^Testing:/i.test(trimmedParagraph)) {
              const headingContent = trimmedParagraph.replace(/^Testing:\s*/i, '').trim();
              
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9);
              pdf.text('Testing:', margin, currentY);
              currentY += 4;
              
              if (headingContent) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                currentY = addTextWithLinks(pdf, headingContent, margin, currentY, pageWidth - 2 * margin);
                currentY += 3;
              }            }
            // Regular paragraph
            else {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              currentY = addTextWithLinks(pdf, trimmedParagraph, margin, currentY, pageWidth - 2 * margin);
              currentY += 3;
            }
          });
          }
          
          currentY += 5;
        }

        currentY = addSectionDivider(pdf, currentY, margin, pageWidth);
      });
    }

    // ===== RECOMMENDATIONS SUMMARY =====
    pdf.addPage();
    currentY = margin;
    
    currentY = addStyledHeader(pdf, 'IMPLEMENTATION RECOMMENDATIONS', currentY, margin, pageWidth);
    
    const recommendations = [
      '1. PRIORITIZE CRITICAL ISSUES: Address all critical accessibility violations first',
      '2. IMPLEMENT SYSTEMATIC FIXES: Use the provided code recommendations',
      '3. TEST WITH SCREEN READERS: Validate fixes with actual assistive technology',
      '4. ESTABLISH ACCESSIBILITY TESTING: Integrate automated scanning into CI/CD',
      '5. TEAM TRAINING: Ensure developers understand accessibility best practices',
      '6. REGULAR AUDITS: Schedule periodic accessibility reviews'
    ];
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    
    recommendations.forEach(rec => {
      const lines = pdf.splitTextToSize(rec, pageWidth - 2 * margin);
      pdf.text(lines, margin, currentY);
      currentY += lines.length * 6 + 5;
    });

    // Add warnings if any
    if (analysisData.warnings && analysisData.warnings.length > 0) {
      currentY += 20;
      currentY = addStyledHeader(pdf, 'ANALYSIS LIMITATIONS', currentY, margin, pageWidth, 12);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      analysisData.warnings.forEach(warning => {
        const warningLines = pdf.splitTextToSize(`• ${warning}`, pageWidth - 2 * margin);
        pdf.text(warningLines, margin, currentY);
        currentY += warningLines.length * 5 + 3;
      });
    }

    // Save with descriptive filename
    const date = new Date().toISOString().split('T')[0];
    const domain = analysisData.manifest?.url ? new URL(analysisData.manifest.url).hostname : 'unknown';
    const filename = `accessibility-audit-${domain}-${date}-${analysisData.sessionId.slice(-8)}.pdf`;
    
    pdf.save(filename);

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}
