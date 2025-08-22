/**
 * Browser selection component for choosing browser and profile options
 */

import { useState, useEffect, useCallback, forwardRef } from 'react';
import { getAvailableBrowsers, type BrowserOption } from '../services/recordingApi';

interface BrowserSelectionProps {
  url: string; // URL to check domain login for
  selectedBrowser: string;
  useProfile: boolean;
  onBrowserChange: (browserType: 'chromium' | 'firefox' | 'webkit', browserName: string) => void;
  onProfileToggle: (useProfile: boolean) => void;
  disabled?: boolean;
  sessionMode: 'new' | 'load'; // Current session mode
}

const BrowserSelection = forwardRef<HTMLDivElement, BrowserSelectionProps>(({
  url: _url, // Not used for cookie detection anymore
  selectedBrowser,
  useProfile,
  onBrowserChange,
  onProfileToggle,
  disabled = false,
  sessionMode
}, ref) => {
  const [browsers, setBrowsers] = useState<BrowserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load browsers once on component mount
    const fetchBrowsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch available browsers
        const browsersResponse = await getAvailableBrowsers();
        setBrowsers(browsersResponse.browsers);
        
        // No auto-selection - let user choose
        console.log('🔍 Browsers loaded, awaiting user selection');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load browsers');
        console.error('Failed to fetch browsers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrowsers();
  }, []); // Only run once on mount

  const selectedBrowserOption = browsers.find(b => b.name === selectedBrowser);
  const canUseProfile = selectedBrowserOption?.available && selectedBrowserOption?.profilePath;

  // Memoized handlers to prevent unnecessary re-renders
  const handleBrowserClick = useCallback((browserType: 'chromium' | 'firefox' | 'webkit', browserName: string) => {
    // In load mode, browsers are disabled until session is selected
    if (!disabled && sessionMode === 'new') {
      onBrowserChange(browserType, browserName);
    }
  }, [disabled, sessionMode, onBrowserChange]);

  const handleProfileToggle = useCallback((checked: boolean) => {
    // In load mode, profile toggle is disabled until session is selected  
    if (!disabled && sessionMode === 'new') {
      onProfileToggle(checked);
    }
  }, [disabled, sessionMode, onProfileToggle]);

  const getProfileStatusText = (browser: BrowserOption) => {
    if (!browser.profilePath) {
      return 'Clean session only';
    }
    
    return useProfile 
      ? 'Using browser profile' 
      : 'Available (not using)';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Detecting available browsers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          ⚠️ Failed to detect browsers: {error}
        </div>
        <div className="text-sm text-gray-500">
          Will use default Chromium browser for recording.
        </div>
      </div>
    );
  }

  const availableBrowsers = browsers.filter(b => b.available);
  
  if (availableBrowsers.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
          ⚠️ No browser profiles detected. Will use clean browser sessions.
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="card rounded-lg p-4">
      <div className="flex items-center justify-center mb-3">
        <h3 className="text-xl font-medium text-brand-dark">
          {sessionMode === 'new' 
            ? (selectedBrowser ? 'Browser Options' : 'Choose Browser')
            : 'Browser Details'}
        </h3>
      </div>
      {sessionMode === 'new' && !selectedBrowser && (
        <p className="text-sm text-gray-600 mb-4 text-center">
          Select a browser to get started with accessibility testing
        </p>
      )}
      {sessionMode === 'load' && !selectedBrowser && (
        <p className="text-sm text-gray-600 mb-4 text-center">
          Browser settings will be automatically configured based on the selected recording
        </p>
      )}
      
      {/* Profile Sharing Toggle - moved to top */}
      {canUseProfile && (
        <div className="mb-6">
          <div className="p-4 bg-white border rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className={`flex-1 flex items-center justify-between text-sm p-2 rounded transition-colors ${
                  disabled || sessionMode === 'load'
                    ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                    : useProfile 
                      ? 'text-blue-600 bg-blue-50 cursor-pointer hover:shadow-sm' 
                      : 'text-gray-400 bg-gray-50 cursor-pointer hover:shadow-sm'
                }`}
                onClick={() => sessionMode === 'new' && !disabled && handleProfileToggle(!useProfile)}
              >
                <span className="flex-1 text-center">
                  {sessionMode === 'load' 
                    ? 'Recorded with authentication - ensure you are logged in'
                    : 'Will use your existing login sessions and browser settings'
                  }
                </span>
                
                <input
                  type="checkbox"
                  id="use-profile"
                  checked={useProfile}
                  onChange={(e) => handleProfileToggle(e.target.checked)}
                  disabled={disabled || sessionMode === 'load'}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                />
              </div>
              
              {/* Info icon with popover - outside the toggle bar */}
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Show authentication information"
                  className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
                {/* Popover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="space-y-3 text-sm">
                    {sessionMode === 'new' ? (
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 mb-1">💡 Authentication Tip</div>
                        <div className="text-gray-700">
                          <p className="mb-2">If your website requires login and you <strong>don't want to record the login process</strong>:</p>
                          <ol className="list-decimal list-inside space-y-1 text-xs bg-blue-50 p-2 rounded mb-2">
                            <li>Log in to your website in a separate browser tab first</li>
                            <li>Then return here and enable this option</li>
                            <li>Your existing login session will be preserved during recording</li>
                          </ol>
                          <p className="text-xs text-gray-600">This avoids capturing sensitive login steps while still testing authenticated content.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 mb-1">🎬 Playback Preparation</div>
                        <div className="text-gray-700">
                          <p className="mb-2">This recording was made with authentication enabled.</p>
                          <div className="text-xs bg-amber-50 p-2 rounded border border-amber-200 mb-2">
                            <strong>Before clicking "Analyze Recording":</strong>
                            <br />• Log in to your website in a separate browser tab
                            <br />• Ensure you can access the authenticated content
                            <br />• Then return here to start the analysis
                          </div>
                          <p className="text-xs text-gray-600">This ensures the playback can access the same authenticated content as the original recording.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Browser Selection - 2x2 grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {availableBrowsers.map((browser) => {
            const isBrowserDisabled = disabled || (sessionMode === 'load');
            const isSelected = selectedBrowser === browser.name;
            const showSelection = isSelected; // Show selection in both new and load modes
            
            return (
              <div
                key={browser.name}
                onClick={() => handleBrowserClick(browser.type, browser.name)}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  showSelection
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${isBrowserDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input
                  type="radio"
                  name="browser"
                  value={browser.name}
                  checked={showSelection}
                  onChange={() => handleBrowserClick(browser.type, browser.name)}
                  disabled={isBrowserDisabled}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-medium text-base mb-2">{browser.name}</div>
                  <div className="text-sm text-gray-500">
                    {sessionMode === 'load' && !selectedBrowser
                      ? 'Awaiting session selection'
                      : sessionMode === 'load' && selectedBrowser && browser.type === selectedBrowser
                        ? `Selected from session${useProfile ? ' with profile' : ''}`
                        : sessionMode === 'load' && selectedBrowser && browser.type !== selectedBrowser
                          ? 'Not used in this session'
                          : getProfileStatusText(browser)
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile sharing not available message */}
      {!canUseProfile && selectedBrowserOption && (
        <div className="mt-4 text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
          ℹ️ Profile sharing not available for {selectedBrowserOption.name}. Will use a clean browser session.
        </div>
      )}
    </div>
  );
});

BrowserSelection.displayName = 'BrowserSelection';

export default BrowserSelection;
