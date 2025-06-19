/**
 * PDF export utilities for accessibility analysis reports
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
        // Check for WCAG references in the before text
        currentX = addWcagLinks(pdf, beforeText, currentX, currentY);
      }
      
      // Add the URL as clickable link
      const url = urlMatch[0];
      pdf.setTextColor(0, 0, 255); // Blue color for links
      pdf.text(url, currentX, currentY);
      
      const textWidth = pdf.getTextWidth(url);
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
 * Add text with WCAG references as clickable links
 */
function addWcagLinks(pdf: jsPDF, text: string, x: number, y: number): number {
  let currentX = x;
  
  // Enhanced regex to catch various WCAG guideline formats:
  // "4.1.2 Name, Role, Value"
  // "WCAG 4.1.2"
  // "WCAG guideline 4.1.2"
  // "wcag244" (from axe results)
  const wcagRegex = /(?:WCAG\s+(?:GUIDELINE\s+)?)?(\d+\.\d+(?:\.\d+)?)\s*([A-Z][A-Za-z\s,\-&]+(?=\s|$|\.|\n))|wcag(\d)(\d)(\d)?/gi;
  
  let wcagMatch;
  let lastIndex = 0;
  
  while ((wcagMatch = wcagRegex.exec(text)) !== null) {
    // Add text before WCAG reference
    const beforeText = text.substring(lastIndex, wcagMatch.index);
    if (beforeText) {
      pdf.text(beforeText, currentX, y);
      currentX += pdf.getTextWidth(beforeText);
    }
    
    let fullMatch = wcagMatch[0];
    let guidelineNumber = '';
    
    // Handle different match patterns
    if (wcagMatch[1]) {
      // Standard format like "4.1.2 Name, Role, Value"
      guidelineNumber = wcagMatch[1];
    } else if (wcagMatch[3] && wcagMatch[4]) {
      // Axe format like "wcag244"
      guidelineNumber = `${wcagMatch[3]}.${wcagMatch[4]}`;
      if (wcagMatch[5]) {
        guidelineNumber += `.${wcagMatch[5]}`;
      }
      // For axe format, just show the guideline number
      fullMatch = guidelineNumber;
    }
    
    if (guidelineNumber) {
      const wcagUrl = `https://www.w3.org/WAI/WCAG21/Understanding/${guidelineNumber.replace(/\./g, '-')}.html`;
      
      pdf.setTextColor(0, 0, 255); // Blue color for links
      pdf.text(fullMatch, currentX, y);
      
      const textWidth = pdf.getTextWidth(fullMatch);
      pdf.link(currentX, y - 3, textWidth, 4, { url: wcagUrl });
      
      currentX += textWidth;
      pdf.setTextColor(0, 0, 0); // Reset to black
    } else {
      // Fallback - just add as regular text
      pdf.text(fullMatch, currentX, y);
      currentX += pdf.getTextWidth(fullMatch);
    }
    
    lastIndex = wcagMatch.index + wcagMatch[0].length;
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
          const cleanCode = cleanTextForPDF(component.relevantHtml);
          
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
              
              const codeLines = pdf.splitTextToSize(cleanCode, pageWidth - 2 * margin - 20);
              const codeHeight = Math.max(codeLines.length * 4 + 8, 15);
              
              // Code background with border
              pdf.setFillColor(254, 242, 242);
              pdf.setDrawColor(220, 38, 127);
              pdf.setLineWidth(0.5);
              pdf.rect(margin, currentY - 2, pageWidth - 2 * margin, codeHeight, 'FD');
              
              pdf.setFont('courier', 'normal');
              pdf.setFontSize(7);
              pdf.text(codeLines, margin + 8, currentY + 4);
              pdf.setFont('helvetica', 'normal');
              currentY += codeHeight + 5;
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
          const cleanSolution = cleanTextForPDF(component.correctedCode);
          
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
            }
            
            if (isActualHtml && !isDescriptiveText) {
              // Show as formatted code
              const solutionLines = pdf.splitTextToSize(cleanSolution, pageWidth - 2 * margin - 20);
              const solutionHeight = Math.max(solutionLines.length * 4 + 8, 15);
              
              pdf.setFillColor(240, 253, 244);
              pdf.setDrawColor(34, 197, 94);
              pdf.setLineWidth(0.5);
              pdf.rect(margin, currentY - 2, pageWidth - 2 * margin, solutionHeight, 'FD');
              
              pdf.setFont('courier', 'normal');
              pdf.setFontSize(7);
              pdf.text(solutionLines, margin + 8, currentY + 4);
              pdf.setFont('helvetica', 'normal');
              currentY += solutionHeight + 5;
            } else {
              // Show as regular text description
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              currentY = addTextWithLinks(pdf, cleanSolution, margin, currentY, pageWidth - 2 * margin);
              currentY += 5;
            }
          }
        }// WCAG Reference
        if (component.wcagRule) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('WCAG GUIDELINE:', margin, currentY);
          currentY += 5;
          
          pdf.setFont('helvetica', 'normal');
          currentY = addTextWithLinks(pdf, component.wcagRule, margin, currentY, pageWidth - 2 * margin);
          currentY += 3;
        }

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
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(styling.color[0], styling.color[1], styling.color[2]);
        pdf.text(`${index + 1}. ${violation.help}`, margin, currentY);
        
        // Keep impact label colored
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(styling.color[0], styling.color[1], styling.color[2]);
        pdf.text(styling.text, pageWidth - margin - 30, currentY);
        
        // Reset to black for subsequent content
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        currentY += 8;

        // Rule ID
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text('RULE ID:', margin, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(violation.id, margin + 20, currentY);
        currentY += 8;        // Description
        pdf.setFont('helvetica', 'bold');
        pdf.text('DESCRIPTION:', margin, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        currentY = addTextWithLinks(pdf, cleanTextForPDF(violation.description), margin, currentY, pageWidth - 2 * margin);
        currentY += 8;        // Affected elements with better formatting
        if (violation.nodes && violation.nodes.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`OFFENDING CODE (${violation.nodes.length} total):`, margin, currentY);
          currentY += 8;          violation.nodes.slice(0, 5).forEach((node, nodeIndex) => {
            // Clean HTML element for better display
            const cleanHtml = node.html ? cleanTextForPDF(node.html) : '';
            const shortHtml = cleanHtml.length > 120 ? cleanHtml.substring(0, 120) + '...' : cleanHtml;
            
            // Code lines for sizing
            const codeLines = pdf.splitTextToSize(shortHtml, pageWidth - 2 * margin - 20);
            const elementHeight = Math.max(codeLines.length * 4 + 12, 20);
            
            // Element background with border
            pdf.setFillColor(254, 242, 242);
            pdf.setDrawColor(220, 38, 127);
            pdf.setLineWidth(0.3);
            pdf.rect(margin, currentY - 2, pageWidth - 2 * margin, elementHeight, 'FD');
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.text(`Element ${nodeIndex + 1}:`, margin + 5, currentY + 4);
            
            if (shortHtml) {
              pdf.setFont('courier', 'normal');
              pdf.setFontSize(7);
              pdf.text(codeLines, margin + 5, currentY + 10);
            }
            
            currentY += elementHeight + 5;
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
          
          // Parse and render recommendation with proper formatting
          const recommendation = cleanTextForPDF(violation.recommendation);
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
                  currentY = addTextWithLinks(pdf, beforeCode, margin + 5, currentY, pageWidth - 2 * margin - 10);
                  currentY += 3;
                }
                
                // Only add code box if there's actual code content
                if (codeContent) {                  // Code example header
                  pdf.setFont('helvetica', 'bold');
                  pdf.setFontSize(9);
                  pdf.text('Code Example:', margin + 5, currentY);
                  currentY += 5;
                  
                  // Clean and format code for better display
                  const cleanCodeContent = cleanTextForPDF(codeContent);
                  const codeLines = pdf.splitTextToSize(cleanCodeContent, pageWidth - 2 * margin - 25);
                  const codeHeight = Math.max(codeLines.length * 4 + 8, 15);
                  
                  // Code background with border
                  pdf.setFillColor(248, 249, 250);
                  pdf.setDrawColor(156, 163, 175);
                  pdf.setLineWidth(0.5);
                  pdf.rect(margin + 5, currentY - 2, pageWidth - 2 * margin - 10, codeHeight, 'FD');
                  
                  pdf.setFont('courier', 'normal');
                  pdf.setFontSize(7);
                  pdf.text(codeLines, margin + 10, currentY + 4);
                  pdf.setFont('helvetica', 'normal');
                  currentY += codeHeight + 5;
                }
              }
            }
            // Check if this is a section heading (Testing:, etc.)
            else if (/^Testing:/i.test(trimmedParagraph)) {
              const headingContent = trimmedParagraph.replace(/^Testing:\s*/i, '').trim();
              
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9);
              pdf.text('Testing:', margin + 5, currentY);
              currentY += 4;
              
              if (headingContent) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                currentY = addTextWithLinks(pdf, headingContent, margin + 5, currentY, pageWidth - 2 * margin - 10);
                currentY += 3;
              }
            }
            // Handle numbered lists with bold numbers
            else if (/^\d+\./.test(trimmedParagraph)) {
              const numberedItems = trimmedParagraph.split(/(?=\d+\.)/);
              
              numberedItems.forEach(item => {
                const trimmedItem = item.trim();
                if (!trimmedItem) return;
                
                const match = trimmedItem.match(/^(\d+\.)(.*)$/s);
                if (match) {
                  const [, number, content] = match;
                  
                  // Bold number
                  pdf.setFont('helvetica', 'bold');
                  pdf.setFontSize(9);
                  pdf.text(number, margin + 5, currentY);
                  
                  // Regular content
                  pdf.setFont('helvetica', 'normal');
                  const numberWidth = pdf.getTextWidth(number + ' ');
                  currentY = addTextWithLinks(pdf, content.trim(), margin + 5 + numberWidth, currentY, pageWidth - 2 * margin - 10 - numberWidth);
                  currentY += 3;
                } else {
                  pdf.setFont('helvetica', 'normal');
                  pdf.setFontSize(9);
                  currentY = addTextWithLinks(pdf, trimmedItem, margin + 5, currentY, pageWidth - 2 * margin - 10);
                  currentY += 3;
                }
              });
            }
            // Regular paragraph
            else {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              currentY = addTextWithLinks(pdf, trimmedParagraph, margin + 5, currentY, pageWidth - 2 * margin - 10);
              currentY += 3;
            }
          });
          
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
