/**
 * Progress indicator for showing current operation status
 */

import { ProgressStage } from '../types';

interface ProgressIndicatorProps {
  stage: ProgressStage;
  message: string;
  progress?: number;
  details?: string;
  error?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  stage, 
  message, 
  progress, 
  details,
  error
}) => {
  const getTypeStyles = () => {
    if (error) {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    if (stage === 'completed') {
      return 'bg-green-50 border-green-200 text-green-800';
    }
    if (stage === 'idle') {
      return 'bg-gray-50 border-gray-200 text-gray-600';
    }
    return 'bg-blue-50 border-blue-200 text-blue-800';
  };

  const getIcon = () => {
    if (error) return '❌';
    if (stage === 'completed') return '✅';
    if (stage === 'idle') return '⏸️';
    return '🔄';
  };

  const isProcessing = stage !== 'idle' && stage !== 'completed' && !error;

  return (
    <div className={`bg-white border rounded p-4 ${getTypeStyles()}`}>
      <div className="flex items-start">
        <span className="text-lg mr-3 flex-shrink-0">
          {isProcessing ? (
            <div className="animate-spin text-blue-600">🔄</div>
          ) : (
            getIcon()
          )}
        </span>          <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">{message}</p>
          
          <h4 className="text-xs opacity-75 capitalize">
            {stage && typeof stage === 'string' ? stage.replace(/-/g, ' ') : 'System Status'} 
          </h4>
          
          {details && (
            <p className="text-xs opacity-75 mb-2">{details}</p>
          )}

          {error && (
            <div className="text-xs bg-red-100 border border-red-200 rounded p-2 mt-2">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {progress !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              
              <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    error ? 'bg-red-500' : stage === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="mt-2 text-xs text-blue-600 font-medium">
              Processing... Please wait
            </div>          )}
        </div>
      </div>
    </div>  );
};

export default ProgressIndicator;
