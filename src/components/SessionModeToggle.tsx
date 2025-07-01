/**
 * Session mode toggle for choosing between new recording or loading saved session
 */

interface SessionModeToggleProps {
  mode: 'new' | 'load';
  onModeChange: (mode: 'new' | 'load') => void;
  disabled?: boolean;
}

const SessionModeToggle: React.FC<SessionModeToggleProps> = ({ mode, onModeChange, disabled = false }) => {
  return (
    <div className="card rounded-lg p-4 mb-4">
      <h3 className="text-xl font-medium text-brand-dark mb-3 text-center">Session Mode</h3>
      
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
          <button
            type="button"
            onClick={() => onModeChange('new')}
            disabled={disabled}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
              ${mode === 'new' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            New Recording
          </button>
          
          <div className="w-px h-5 bg-gray-300 mx-1 self-center"></div>
          
          <button
            type="button"
            onClick={() => onModeChange('load')}
            disabled={disabled}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
              ${mode === 'load' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            Load Session
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 text-center mt-2">
        {mode === 'new' 
          ? 'Record new user interactions on a website' 
          : 'Analyze a previously recorded session'
        }
      </p>
    </div>
  );
};

export default SessionModeToggle;
