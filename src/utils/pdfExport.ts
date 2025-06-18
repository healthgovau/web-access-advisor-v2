/**
 * PDF export utilities for accessibility analysis reports
 */

import jsPDF from 'jspdf';
import type { AnalysisResult } from '../types';

/**
 * Clean text for PDF output - remove HTML entities and special characters
 */
function cleanTextForPDF(text: string): string {
  if (!text) return '';
  
  return text
    // First pass - decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Decode numeric HTML entities
    .replace(/&#(\d+);/g, (_, num) => {
      const code = parseInt(num, 10);
      return (code >= 32 && code <= 126) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return (code >= 32 && code <= 126) ? String.fromCharCode(code) : '';
    })
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Convert common Unicode characters to ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")  // Smart quotes
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-')  // En/em dashes
    .replace(/[\u2026]/g, '...')      // Ellipsis
    .replace(/[\u00A0]/g, ' ')        // Non-breaking space
    // More aggressive character replacements
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ß]/g, 'ss')
    .replace(/[Ø]/g, 'O')
    // Remove control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Ultra-aggressive: only allow basic printable ASCII
    .replace(/[^\u0020-\u007E]/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Add text with clickable links to PDF
 */
function addTextWithLinks(pdf: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  // Combined regex for URLs and WCAG references
  const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|WCAG\s+\d+\.\d+(?:\.\d+)?(?:\s+\([^)]+\))?)/gi;
  
  let currentY = y;
  const lines = pdf.splitTextToSize(text, maxWidth);
  
  lines.forEach((line: string) => {
    let parts = line.split(linkRegex);
    let currentX = x;
    
    parts.forEach((part) => {
      if (/https?:\/\//.test(part)) {
        // This is a URL - add as clickable link
        pdf.setTextColor(0, 0, 255); // Blue color for links
        pdf.text(part, currentX, currentY);
        
        const textWidth = pdf.getTextWidth(part);
        pdf.link(currentX, currentY - 3, textWidth, 4, { url: part });
        
        currentX += textWidth;
        pdf.setTextColor(0, 0, 0); // Reset to black
      } else if (/WCAG\s+\d+\.\d+/i.test(part)) {
        // This is a WCAG reference - make it a link to WCAG guidelines
        const wcagUrl = `https://www.w3.org/WAI/WCAG21/Understanding/`;
        
        pdf.setTextColor(0, 0, 255); // Blue color for links
        pdf.text(part, currentX, currentY);
        
        const textWidth = pdf.getTextWidth(part);
        pdf.link(currentX, currentY - 3, textWidth, 4, { url: wcagUrl });
        
        currentX += textWidth;
        pdf.setTextColor(0, 0, 0); // Reset to black
      } else if (part.trim()) {
        // Regular text
        pdf.text(part, currentX, currentY);
        currentX += pdf.getTextWidth(part);
      }
    });
    
    currentY += 4; // Line height
  });
  
  return currentY;
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
 * Get impact level styling
 */
function getImpactStyling(impact: string): { color: [number, number, number], text: string } {
  switch (impact.toLowerCase()) {
    case 'critical':
      return { color: [220, 38, 127], text: '🔴 CRITICAL' };
    case 'serious':
      return { color: [234, 88, 12], text: '🟠 SERIOUS' };
    case 'moderate':
      return { color: [202, 138, 4], text: '🟡 MODERATE' };
    case 'minor':
      return { color: [37, 99, 235], text: '🔵 MINOR' };
    default:
      return { color: [107, 114, 128], text: '⚫ UNKNOWN' };
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
 * Generate comprehensive PDF from analysis results
 */
export async function exportAnalysisToPDF(
  analysisData: AnalysisResult
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
      currentY = addStyledHeader(pdf, 'EXECUTIVE SUMMARY', currentY, margin, pageWidth, 14);
      
      let totalIssues = 0;
      let criticalCount = 0;
      
      if (analysisData.analysis?.components) {
        totalIssues += analysisData.analysis.components.length;
        criticalCount += analysisData.analysis.components.filter(c => c.impact === 'critical').length;
      }
      
      if (analysisData.axeResults) {
        totalIssues += analysisData.axeResults.length;
        criticalCount += analysisData.axeResults.filter(v => v.impact === 'critical').length;
      }

      pdf.setFontSize(11);
      const summaryText = [
        `This accessibility analysis identified ${totalIssues} issues across the tested website.`,
        `${criticalCount} critical issues require immediate attention to ensure WCAG compliance.`,
        `This report combines AI-powered screen reader analysis with automated axe-core scanning`,
        `to provide comprehensive accessibility insights for development teams.`
      ];
      
      summaryText.forEach(line => {
        const lines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        pdf.text(lines, margin, currentY);
        currentY += lines.length * 6 + 3;
      });
      
      currentY += 15;
    }    // ===== SCREEN READER ACCESSIBILITY ISSUES =====
    if (analysisData.analysis?.components && analysisData.analysis.components.length > 0) {
      currentY = addStyledHeader(pdf, 'SCREEN READER ACCESSIBILITY ISSUES', currentY, margin, pageWidth);
      
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
        }

        // Issue header with styling
        const styling = getImpactStyling(component.impact);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(styling.color[0], styling.color[1], styling.color[2]);
        pdf.text(`${index + 1}. ${component.componentName}`, margin, currentY);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(styling.text, pageWidth - margin - 30, currentY);
        currentY += 10;

        // Issue details in structured format
        const sections = [
          { label: 'ISSUE DESCRIPTION', content: component.issue },
          { label: 'TECHNICAL EXPLANATION', content: component.explanation }
        ];        sections.forEach(section => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text(section.label + ':', margin, currentY);
          currentY += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          currentY = addTextWithLinks(pdf, cleanTextForPDF(section.content), margin, currentY, pageWidth - 2 * margin);
          currentY += 5;
        });

        // Code sections with proper formatting
        if (component.relevantHtml) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('PROBLEMATIC CODE:', margin, currentY);
          currentY += 5;
          
          // Code background
          const codeLines = pdf.splitTextToSize(component.relevantHtml, pageWidth - 2 * margin - 10);
          const codeHeight = codeLines.length * 3 + 6;
          pdf.setFillColor(254, 242, 242);
          pdf.rect(margin, currentY - 2, pageWidth - 2 * margin, codeHeight, 'F');
          
          pdf.setFont('courier', 'normal');
          pdf.setFontSize(8);
          pdf.text(codeLines, margin + 5, currentY + 2);
          pdf.setFont('helvetica', 'normal');
          currentY += codeHeight + 5;
        }

        if (component.correctedCode) {
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
          
          // Solution code background
          const solutionLines = pdf.splitTextToSize(component.correctedCode, pageWidth - 2 * margin - 10);
          const solutionHeight = solutionLines.length * 3 + 6;
          pdf.setFillColor(240, 253, 244);
          pdf.rect(margin, currentY - 2, pageWidth - 2 * margin, solutionHeight, 'F');
          
          pdf.setFont('courier', 'normal');
          pdf.setFontSize(8);
          pdf.text(solutionLines, margin + 5, currentY + 2);
          pdf.setFont('helvetica', 'normal');
          currentY += solutionHeight + 5;
        }

        // WCAG Reference
        if (component.wcagRule) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('WCAG GUIDELINE:', margin, currentY);
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(component.wcagRule, margin + 35, currentY);
          currentY += 8;
        }

        currentY = addSectionDivider(pdf, currentY, margin, pageWidth);
      });
    }

    // ===== AUTOMATED ACCESSIBILITY SCAN (AXE RESULTS) =====
    if (analysisData.axeResults && analysisData.axeResults.length > 0) {
      // New page for axe results
      pdf.addPage();
      currentY = margin;
      
      currentY = addStyledHeader(pdf, 'AXE ACCESSIBILITY ISSUES', currentY, margin, pageWidth);

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
        }

        // Violation header
        const styling = getImpactStyling(violation.impact);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(styling.color[0], styling.color[1], styling.color[2]);
        pdf.text(`${index + 1}. ${violation.help}`, margin, currentY);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(styling.text, pageWidth - margin - 30, currentY);
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
          currentY += 8;

          violation.nodes.slice(0, 5).forEach((node, nodeIndex) => {
            // Element background
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, currentY - 2, pageWidth - 2 * margin, 12, 'F');
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.text(`Element ${nodeIndex + 1}:`, margin + 2, currentY + 3);
            
            pdf.setFont('courier', 'normal');
            const selectorText = Array.isArray(node.target) ? node.target.join(' > ') : node.target;
            const shortSelector = selectorText.length > 80 ? selectorText.substring(0, 80) + '...' : selectorText;
            pdf.text(shortSelector, margin + 2, currentY + 8);
            
            currentY += 15;
          });          if (violation.nodes.length > 5) {
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
                if (codeContent) {
                  // Code example header
                  pdf.setFont('helvetica', 'bold');
                  pdf.setFontSize(9);
                  pdf.text('Code Example:', margin + 5, currentY);
                  currentY += 5;
                  
                  // Code background
                  const codeLines = pdf.splitTextToSize(codeContent, pageWidth - 2 * margin - 10);
                  const codeHeight = codeLines.length * 3 + 6;
                  pdf.setFillColor(248, 249, 250); // Light gray background for code
                  pdf.rect(margin + 5, currentY - 2, pageWidth - 2 * margin - 10, codeHeight, 'F');
                  
                  pdf.setFont('courier', 'normal');
                  pdf.setFontSize(8);
                  pdf.text(codeLines, margin + 10, currentY + 2);
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
