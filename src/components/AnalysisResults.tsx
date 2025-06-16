/**
 * Display Gemini analysis results and accessibility findings
 */

import { useState } from 'react';

const AnalysisResults = ({ analysisData, isLoading, error }) => {
  const [activeFlow, setActiveFlow] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Analyzing accessibility with Gemini AI...</span>
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

  if (!analysisData || analysisData.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Results</h3>
        <p className="text-gray-500">
          No analysis results yet. Complete a recording and replay to see accessibility analysis here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Accessibility Analysis Results
        </h3>
        <span className="text-sm text-gray-500">
          {analysisData.length} flow{analysisData.length !== 1 ? 's' : ''} analyzed
        </span>
      </div>

      {/* Flow Tabs */}
      {analysisData.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {analysisData.map((flow, index) => (
              <button
                key={index}
                onClick={() => setActiveFlow(index)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeFlow === index
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {flow.flowName || `Flow ${index + 1}`}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Active Flow Content */}
      {analysisData[activeFlow] && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  {analysisData[activeFlow].flowName || `Flow ${activeFlow + 1}`}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {analysisData[activeFlow].stepCount} steps analyzed
                </p>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {analysisData[activeFlow].timestamp}
              </span>
            </div>

            {/* Summary Section */}
            <div className="mb-6">
              <button
                onClick={() => toggleSection(`summary-${activeFlow}`)}
                className="flex items-center justify-between w-full text-left"
              >
                <h5 className="text-md font-medium text-gray-800">Summary</h5>
                <span className="text-gray-400">
                  {expandedSections[`summary-${activeFlow}`] ? '−' : '+'}
                </span>
              </button>
              
              {expandedSections[`summary-${activeFlow}`] && (
                <div className="mt-3 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {analysisData[activeFlow].summary}
                  </p>
                </div>
              )}
            </div>

            {/* Issues Section */}
            {analysisData[activeFlow].issues && analysisData[activeFlow].issues.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => toggleSection(`issues-${activeFlow}`)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h5 className="text-md font-medium text-gray-800">
                    Issues Found ({analysisData[activeFlow].issues.length})
                  </h5>
                  <span className="text-gray-400">
                    {expandedSections[`issues-${activeFlow}`] ? '−' : '+'}
                  </span>
                </button>
                
                {expandedSections[`issues-${activeFlow}`] && (
                  <div className="mt-3 space-y-3">
                    {analysisData[activeFlow].issues.map((issue, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-md">
                        <div className="flex items-start justify-between mb-2">
                          <h6 className="font-medium text-gray-900">{issue.title}</h6>
                          <span className={`px-2 py-1 text-xs rounded ${
                            issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                        {issue.recommendation && (
                          <div className="text-sm">
                            <span className="font-medium text-green-700">Recommendation: </span>
                            <span className="text-gray-700">{issue.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations Section */}
            <div className="mb-6">
              <button
                onClick={() => toggleSection(`recommendations-${activeFlow}`)}
                className="flex items-center justify-between w-full text-left"
              >
                <h5 className="text-md font-medium text-gray-800">Recommendations</h5>
                <span className="text-gray-400">
                  {expandedSections[`recommendations-${activeFlow}`] ? '−' : '+'}
                </span>
              </button>
              
              {expandedSections[`recommendations-${activeFlow}`] && (
                <div className="mt-3 p-4 bg-green-50 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {analysisData[activeFlow].recommendations}
                  </p>
                </div>
              )}
            </div>

            {/* Raw Analysis */}
            <div>
              <button
                onClick={() => toggleSection(`raw-${activeFlow}`)}
                className="flex items-center justify-between w-full text-left"
              >
                <h5 className="text-md font-medium text-gray-800">Full Analysis</h5>
                <span className="text-gray-400">
                  {expandedSections[`raw-${activeFlow}`] ? '−' : '+'}
                </span>
              </button>
              
              {expandedSections[`raw-${activeFlow}`] && (
                <div className="mt-3 p-4 bg-gray-50 rounded-md">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {analysisData[activeFlow].rawAnalysis}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResults;
