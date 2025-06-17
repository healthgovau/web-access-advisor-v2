/**
 * Display accessibility analysis results with warnings support
 */

import type { AnalysisResult } from '../types';

interface AnalysisResultsProps {
  analysisData: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysisData, isLoading, error }) => {
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
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">
            {analysisData.snapshotCount} snapshots analyzed • Session: {analysisData.sessionId}
          </p>
        </div>        {/* Gemini Analysis Results */}
        {analysisData.analysis ? (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Component Issues */}
              {analysisData.analysis.components && analysisData.analysis.components.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-medium text-gray-900 mb-6 text-center">Issues Identified</h3>
                  
                  {/* Issue Count Summary */}
                  {(() => {
                    const counts = analysisData.analysis.components.reduce((acc, component) => {
                      acc[component.impact] = (acc[component.impact] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                      
                    return (                      <div className="w-full flex justify-center mb-8">
                        <div className="inline-grid grid-cols-2 md:grid-cols-4 gap-4">
                          {['critical', 'serious', 'moderate', 'minor'].map(impact => (
                            <div key={impact} className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="text-lg font-bold text-gray-900">{counts[impact] || 0}</div>
                              <div className="text-xs font-medium text-gray-600 uppercase">{impact}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-4">
                    {analysisData.analysis.components.map((component, index) => (
                      <div key={index} className="bg-white border border-gray-300 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-base font-medium text-gray-900">{component.componentName}</h4>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            component.impact === 'critical' ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                            component.impact === 'serious' ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                            component.impact === 'moderate' ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                            'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}>
                            {component.impact.toUpperCase()} IMPACT
                          </span>
                        </div>                        <div className="space-y-3 text-left">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Issue: </span>
                            <span className="text-sm text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>{component.issue}</span>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-gray-700">Explanation: </span>
                            <span className="text-sm text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>{component.explanation}</span>
                          </div>
                          
                          {component.correctedCode && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Recommended Solution: </span>
                              <span className="text-sm text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>{component.codeChangeSummary}</span>
                              <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 overflow-x-auto" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>
                                <code style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}>{component.correctedCode}</code>
                              </pre>
                            </div>
                          )}
                          
                          {component.wcagRule && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">WCAG Guideline: </span>
                              <a 
                                href={`https://www.w3.org/WAI/WCAG21/Understanding/${component.wcagRule.toLowerCase().replace(/\s+/g, '-')}.html`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal' }}
                              >
                                {component.wcagRule}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
