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
    // Using SVG icons with improved designs for better visual consistency
    const iconClass = "w-5 h-5 flex-shrink-0";
    
    switch (status) {
      case 'pending': 
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <path d="M8 12h8" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'active':
        if (phase === 'recording') {
          return (
            <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" fill="white" />
            </svg>
          );
        }        if (phase === 'replay') {
          return (
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          );
        }
        if (phase === 'ai') {
          return (
            <svg className={`${iconClass} animate-pulse`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          );
        }
        return (
          <svg className={`${iconClass} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'completed': 
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error': 
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'skipped': 
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default: 
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <path d="M8 12h8" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
    }
  };  const getStatusColor = (status: PhaseStatus['status']) => {
    switch (status) {
      case 'pending': 
        return 'status-pending';
      case 'active': 
        return 'status-active';
      case 'completed': 
        return 'status-completed';
      case 'error': 
        return 'status-error';
      case 'skipped': 
        return 'status-warning';
      default: 
        return 'status-pending';
    }
  };  return (
    <div className="card rounded-lg p-4">
      <h3 className="text-xl font-medium text-brand-dark mb-3">Progress</h3>
        {/* Compact horizontal layout */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {phases.map((phase) => (
          <div key={phase.phase} className={`border rounded p-3 transition-all duration-300 ${getStatusColor(phase.status)}`}>
            <div className="mb-1">              {/* Status icon above the heading */}
              <div className="flex justify-center mb-2">
                {phase.status === 'active' && phase.phase === 'replay' ? (
                  <div className="animate-spin-reverse">
                    {getStatusIcon(phase.status, phase.phase)}
                  </div>
                ) : (
                  getStatusIcon(phase.status, phase.phase)
                )}
              </div>
                <div className="text-center">
                <h4 className="text-base font-semibold uppercase tracking-wide mb-1">
                  {phase.phase === 'ai' ? 'AI Analysis' : phase.phase}
                </h4>
              </div>
            </div>
            
            <p className="text-sm text-center mb-1 font-medium">{phase.message}</p>
            
            {phase.details && (
              <p className="text-sm text-center opacity-80">{phase.details}</p>
            )}
              {phase.error && (
              <div className="text-sm status-error rounded p-1 mt-2">
                <strong>Error:</strong> {phase.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreePhaseStatus;
