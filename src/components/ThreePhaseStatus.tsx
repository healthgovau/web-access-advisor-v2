/**
 * Three-phase status display for accessibility analysis
 * Shows Recording, Replay & Capture, and AI Analysis phases simultaneously
 */

import { ProgressStage } from '../types';

interface PhaseStatus {
  phase: 'recording' | 'replay' | 'ai';
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';
  message: string;
  details?: string;
  error?: string;
}

interface ThreePhaseStatusProps {
  currentStage: ProgressStage;
  error?: string;
  actionCount?: number;
  snapshotCount?: number;
  warnings?: string[];
}

const ThreePhaseStatus: React.FC<ThreePhaseStatusProps> = ({ 
  currentStage, 
  error,
  actionCount = 0,
  snapshotCount = 0,
  warnings = []
}) => {
    // Determine phase statuses based on current stage
  const getPhaseStatuses = (): PhaseStatus[] => {
    // Debug log to help track stage transitions
    console.log('ThreePhaseStatus - Current stage:', currentStage);
    
    const phases: PhaseStatus[] = [
      {
        phase: 'recording',
        status: 'pending',
        message: 'Ready to record',
        details: 'Navigate and interact with the website'
      },
      {
        phase: 'replay',
        status: 'pending', 
        message: 'Ready to replay',
        details: 'Automated replay with accessibility scans'
      },
      {
        phase: 'ai',
        status: 'pending',
        message: 'Ready for analysis',
        details: 'AI-powered accessibility insights'
      }
    ];

    // Update statuses based on current stage
    switch (currentStage) {
      case 'idle':
        break;
          case 'starting-browser':
      case 'recording':
        phases[0].status = 'active';
        phases[0].message = currentStage === 'starting-browser' ? 'Launching browser...' : 'Recording in progress...';
        phases[0].details = `${actionCount} actions captured`;
        break;
        
      case 'stopping-recording':
        phases[0].status = 'completed';
        phases[0].message = 'Recording complete';
        phases[0].details = `${actionCount} actions captured`;
        break;
        
      case 'recording-complete':
        phases[0].status = 'completed';
        phases[0].message = 'Recording complete';
        phases[0].details = `${actionCount} actions captured`;
        break;
          case 'preparing-analysis':
      case 'replaying-actions':
      case 'capturing-snapshots':
      case 'running-accessibility-checks':
        phases[0].status = 'completed';
        phases[0].message = 'Recording complete';
        phases[0].details = `${actionCount} actions captured`;        phases[1].status = 'active';
        phases[1].message = currentStage === 'preparing-analysis' ? 'Preparing replay...' :
                           currentStage === 'replaying-actions' ? 'Replaying interactions...' :
                           currentStage === 'capturing-snapshots' ? 'Capturing screenshots...' :
                           'Running accessibility scans...';
        phases[1].details = snapshotCount > 0 ? 
          `${snapshotCount} snapshots captured` : 
          'Processing interactions';
        
        phases[2].status = 'pending';
        phases[2].message = 'Waiting for replay';
        phases[2].details = 'Analysis will begin after replay completes';
        break;
          case 'processing-with-ai':
      case 'generating-report':
        phases[0].status = 'completed';
        phases[0].message = 'Recording complete';
        phases[0].details = `${actionCount} actions captured`;
        
        phases[1].status = 'completed';
        phases[1].message = 'Replay complete';
        phases[1].details = `${snapshotCount} snapshots captured`;
          phases[2].status = 'active';
        phases[2].message = currentStage === 'processing-with-ai' ? 'Analyzing with AI...' : 'Generating report...';
        phases[2].details = snapshotCount > 0 ? 
          `Processing ${snapshotCount} snapshots` : 
          'Analyzing accessibility data';
        break;
          case 'completed':
        phases[0].status = 'completed';
        phases[0].message = 'Recording complete';
        phases[0].details = `${actionCount} actions captured`;
        
        phases[1].status = 'completed';
        phases[1].message = 'Replay complete';
        phases[1].details = `${snapshotCount} snapshots captured`;
        
        // Check if AI analysis was skipped due to warnings (e.g., Gemini not available)
        const hasGeminiWarning = warnings.some(warning => 
          warning.includes('Gemini') || 
          warning.includes('AI analysis unavailable') ||
          warning.includes('API key not configured')
        );
        
        if (snapshotCount === 0) {
          phases[2].status = 'skipped';
          phases[2].message = 'Analysis skipped';
          phases[2].details = 'No snapshots to analyze';
        } else if (hasGeminiWarning) {
          phases[2].status = 'skipped';
          phases[2].message = 'AI analysis skipped';
          phases[2].details = 'Gemini API not configured';
        } else {
          phases[2].status = 'completed';
          phases[2].message = 'Analysis complete';
          phases[2].details = 'Report generated successfully';
        }
        break;
        
      case 'error':
        // Determine which phase had the error
        if (['starting-browser', 'recording', 'stopping-recording'].includes(currentStage)) {
          phases[0].status = 'error';
          phases[0].message = 'Recording failed';
          phases[0].error = error;
        } else if (['preparing-analysis', 'replaying-actions', 'capturing-snapshots', 'running-accessibility-checks'].includes(currentStage)) {
          phases[0].status = 'completed';
          phases[1].status = 'error';
          phases[1].message = 'Replay failed';
          phases[1].error = error;
        } else {
          phases[0].status = 'completed';
          phases[1].status = 'completed';
          phases[2].status = 'error';
          phases[2].message = 'AI analysis failed';
          phases[2].error = error;        }
        break;
    }

    return phases;
  };

  const phases = getPhaseStatuses();  const getStatusIcon = (status: PhaseStatus['status'], phase: string) => {
    switch (status) {
      case 'pending': return '⏸️';
      case 'active': 
        // Use different icons for different phases
        if (phase === 'recording') return '🔴';
        if (phase === 'replay') return '🔄';
        if (phase === 'ai') return '🧠';
        return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'skipped': return '⚠️';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status: PhaseStatus['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500 bg-gray-50 border-gray-200';
      case 'active': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-700 bg-green-50 border-green-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      case 'skipped': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Analysis Progress</h3>
      
      {/* Compact horizontal layout */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {phases.map((phase) => (
          <div key={phase.phase} className={`border rounded p-3 transition-all duration-300 ${getStatusColor(phase.status)}`}>            <div className="mb-1">
              {/* Status icon above the heading */}
              <div className="flex justify-center mb-2">
                <span className="text-lg">
                  {phase.status === 'active' ? (
                    <div className={phase.phase === 'replay' ? 'animate-spin-reverse' : ''}>
                      {getStatusIcon(phase.status, phase.phase)}
                    </div>
                  ) : (
                    getStatusIcon(phase.status, phase.phase)
                  )}
                </span>
              </div>
              
              <div className="text-center">
                <h4 className="text-sm font-medium uppercase tracking-wide">
                  {phase.phase === 'ai' ? 'AI Analysis' : phase.phase}
                </h4>
              </div>
            </div>            
            <p className="text-xs opacity-90 mb-1 text-center">{phase.message}</p>
            
            {phase.details && (
              <p className="text-xs opacity-75 text-center">{phase.details}</p>
            )}
            
            {phase.error && (
              <div className="text-xs bg-red-100 border border-red-200 rounded p-1 mt-1">
                <strong>Error:</strong> {phase.error}
              </div>
            )}
          </div>
        ))}      </div>
    </div>
  );
};

export default ThreePhaseStatus;
