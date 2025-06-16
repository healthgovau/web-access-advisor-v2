/**
 * Progress indicator for showing current operation status
 */

const ProgressIndicator = ({ 
  isVisible, 
  title, 
  message, 
  progress, 
  type = 'info' 
}) => {
  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '🔄';
    }
  };

  return (
    <div className={`fixed top-4 right-4 max-w-sm w-full bg-white border rounded-lg shadow-lg z-50 ${getTypeStyles()}`}>
      <div className="p-4">
        <div className="flex items-start">
          <span className="text-lg mr-3">{getIcon()}</span>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-medium mb-1">{title}</h4>
            )}
            
            {message && (
              <p className="text-sm opacity-90">{message}</p>
            )}
            
            {progress !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div 
                    className="bg-current h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
