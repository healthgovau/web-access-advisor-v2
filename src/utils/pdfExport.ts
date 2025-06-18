/**
 * PDF export utilities for accessibility analysis reports
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { AnalysisResult } from '../types';

/**
 * Generate PDF from analysis results
 */
export async function exportAnalysisToPDF(
  analysisData: AnalysisResult,
  elementToCapture?: HTMLElement
): Promise<void> {
  try {
    // Create PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Add title and metadata
    pdf.setFontSize(20);
    pdf.text('Web Accessibility Analysis Report', margin, currentY);
    currentY += 15;

    pdf.setFontSize(10);
    pdf.text(`Session ID: ${analysisData.sessionId}`, margin, currentY);
    currentY += 6;
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, currentY);
    currentY += 6;
    pdf.text(`Snapshots Analyzed: ${analysisData.snapshotCount}`, margin, currentY);
    currentY += 15;

    // Add summary if analysis exists
    if (analysisData.analysis?.components) {
      const counts = analysisData.analysis.components.reduce((acc, component) => {
        acc[component.impact] = (acc[component.impact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      pdf.setFontSize(14);
      pdf.text('Issues Summary', margin, currentY);
      currentY += 10;

      pdf.setFontSize(10);
      ['critical', 'serious', 'moderate', 'minor'].forEach(impact => {
        pdf.text(`${impact.charAt(0).toUpperCase() + impact.slice(1)}: ${counts[impact] || 0}`, margin, currentY);
        currentY += 6;
      });
      currentY += 10;

      // Add detailed findings
      pdf.setFontSize(14);
      pdf.text('Detailed Findings', margin, currentY);
      currentY += 10;

      analysisData.analysis.components.forEach((component, index) => {
        // Check if we need a new page
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.setFontSize(12);
        pdf.text(`${index + 1}. ${component.componentName}`, margin, currentY);
        currentY += 8;

        pdf.setFontSize(9);
        pdf.text(`Impact: ${component.impact.toUpperCase()}`, margin, currentY);
        currentY += 6;

        // Issue description
        const issueLines = pdf.splitTextToSize(`Issue: ${component.issue}`, pageWidth - 2 * margin);
        pdf.text(issueLines, margin, currentY);
        currentY += issueLines.length * 4 + 3;

        // Explanation
        const explanationLines = pdf.splitTextToSize(`Explanation: ${component.explanation}`, pageWidth - 2 * margin);
        pdf.text(explanationLines, margin, currentY);
        currentY += explanationLines.length * 4 + 3;

        // WCAG Reference
        if (component.wcagRule) {
          pdf.text(`WCAG Guideline: ${component.wcagRule}`, margin, currentY);
          currentY += 6;
        }

        // Code sections
        if (component.relevantHtml) {
          pdf.text('Offending Code:', margin, currentY);
          currentY += 5;
          pdf.setFont('courier');
          const codeLines = pdf.splitTextToSize(component.relevantHtml, pageWidth - 2 * margin);
          pdf.text(codeLines, margin, currentY);
          currentY += codeLines.length * 3 + 3;
          pdf.setFont('helvetica');
        }

        if (component.correctedCode) {
          pdf.text('Recommended Code:', margin, currentY);
          currentY += 5;
          pdf.setFont('courier');
          const fixedCodeLines = pdf.splitTextToSize(component.correctedCode, pageWidth - 2 * margin);
          pdf.text(fixedCodeLines, margin, currentY);
          currentY += fixedCodeLines.length * 3 + 8;
          pdf.setFont('helvetica');
        }        currentY += 5; // Space between components
      });
    }

    // Add Axe Results Section
    if (analysisData.axeResults && analysisData.axeResults.length > 0) {
      // Check if we need a new page
      if (currentY > pageHeight - 50) {
        pdf.addPage();
        currentY = margin;
      } else {
        currentY += 10;
      }

      pdf.setFontSize(16);
      pdf.text('Automated Accessibility Scan (Axe Results)', margin, currentY);
      currentY += 15;

      // Axe summary
      const axeCounts = analysisData.axeResults.reduce((acc, violation) => {
        acc[violation.impact] = (acc[violation.impact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      pdf.setFontSize(12);
      pdf.text('Axe Issues Summary', margin, currentY);
      currentY += 8;

      pdf.setFontSize(10);
      ['critical', 'serious', 'moderate', 'minor'].forEach(impact => {
        pdf.text(`${impact.charAt(0).toUpperCase() + impact.slice(1)}: ${axeCounts[impact] || 0}`, margin, currentY);
        currentY += 6;
      });
      currentY += 10;

      // Detailed axe findings
      pdf.setFontSize(12);
      pdf.text('Detailed Axe Findings', margin, currentY);
      currentY += 10;

      analysisData.axeResults.forEach((violation, index) => {
        // Check if we need a new page
        if (currentY > pageHeight - 60) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.setFontSize(11);
        pdf.text(`${index + 1}. ${violation.help}`, margin, currentY);
        currentY += 8;

        pdf.setFontSize(9);
        pdf.text(`Impact: ${violation.impact.toUpperCase()}`, margin, currentY);
        currentY += 5;
        pdf.text(`Rule ID: ${violation.id}`, margin, currentY);
        currentY += 6;

        // Description
        const descLines = pdf.splitTextToSize(`Description: ${violation.description}`, pageWidth - 2 * margin);
        pdf.text(descLines, margin, currentY);
        currentY += descLines.length * 4 + 3;

        // WCAG Tags
        if (violation.tags && violation.tags.length > 0) {
          const tagsText = `WCAG Tags: ${violation.tags.join(', ')}`;
          const tagLines = pdf.splitTextToSize(tagsText, pageWidth - 2 * margin);
          pdf.text(tagLines, margin, currentY);
          currentY += tagLines.length * 4 + 3;
        }

        // Affected elements (show first 3)
        if (violation.nodes && violation.nodes.length > 0) {
          pdf.text(`Affected Elements (${violation.nodes.length} total):`, margin, currentY);
          currentY += 5;

          violation.nodes.slice(0, 3).forEach((node, nodeIndex) => {
            pdf.setFont('courier');
            pdf.setFontSize(8);
            const selectorText = Array.isArray(node.target) ? node.target.join(' > ') : node.target;
            const selectorLines = pdf.splitTextToSize(`${nodeIndex + 1}. ${selectorText}`, pageWidth - 2 * margin - 5);
            pdf.text(selectorLines, margin + 5, currentY);
            currentY += selectorLines.length * 3 + 2;
            pdf.setFont('helvetica');
            pdf.setFontSize(9);
          });

          if (violation.nodes.length > 3) {
            pdf.text(`... and ${violation.nodes.length - 3} more elements`, margin + 5, currentY);
            currentY += 5;
          }
        }

        currentY += 8; // Space between violations
      });
    }

    // If element provided, also capture visual representation
    if (elementToCapture) {
      try {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Visual Report', margin, margin);
        
        const canvas = await html2canvas(elementToCapture, {
          scale: 1,
          useCORS: true,
          allowTaint: false
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', margin, margin + 10, imgWidth, imgHeight);
      } catch (error) {
        console.warn('Failed to capture visual representation:', error);
      }
    }

    // Add warnings if any
    if (analysisData.warnings && analysisData.warnings.length > 0) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text('Warnings & Limitations', margin, margin);
      currentY = margin + 10;

      pdf.setFontSize(10);
      analysisData.warnings.forEach(warning => {
        const warningLines = pdf.splitTextToSize(`• ${warning}`, pageWidth - 2 * margin);
        pdf.text(warningLines, margin, currentY);
        currentY += warningLines.length * 4 + 3;
      });
    }

    // Save the PDF
    const filename = `accessibility-report-${analysisData.sessionId}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}
