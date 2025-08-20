/**
 * Browser selection component for choosing browser and profile options
 */

import { useState, useEffect, useCallback, forwardRef } from 'react';
import { getAvailableBrowsers, checkDomainLogin, type BrowserOption } from '../services/recordingApi';

interface BrowserSelectionProps {
  url: string; // URL to check domain login for
  selectedBrowser: string;
  useProfile: boolean;
  onBrowserChange: (browserType: 'chromium' | 'firefox' | 'webkit', browserName: string) => void;
  onProfileToggle: (useProfile: boolean) => void;
  disabled?: boolean;
}

const BrowserSelection = forwardRef<HTMLDivElement, BrowserSelectionProps>(({
  url,
  selectedBrowser,
  useProfile,
  onBrowserChange,
  onProfileToggle,
  disabled = false
}, ref) => {
  const [browsers, setBrowsers] = useState<BrowserOption[]>([]);
  const [loginStatus, setLoginStatus] = useState<{ [browserName: string]: boolean }>({});
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

  // Separate effect for URL domain checking with debouncing
  useEffect(() => {
    if (!url.trim()) {
      setLoginStatus({});
      return;
    }

    console.log('🔍 DEBUG URL changed, will check login status:', { url });
    
    // Debounce timer for domain login checking only
    const debounceTimer = setTimeout(async () => {
      console.log('🔍 Debounce completed, checking login status for:', url);
      
      try {
        // Add a 2-second timeout for login checking
        const loginPromise = checkDomainLogin(url);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Login check timeout')), 2000)
        );
        
        const loginResponse = await Promise.race([loginPromise, timeoutPromise]);
        setLoginStatus(loginResponse.loginStatus);
      } catch (loginError: any) {
        console.warn('Failed to check domain login:', loginError);
        setLoginStatus({});
      }
    }, 500); // Wait 500ms before making API call
    
    // Cleanup function to clear timeout on URL change
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [url]);

  const selectedBrowserOption = browsers.find(b => b.name === selectedBrowser);
  const canUseProfile = selectedBrowserOption?.available && selectedBrowserOption?.profilePath;

  // Memoized handlers to prevent unnecessary re-renders
  const handleBrowserClick = useCallback((browserType: 'chromium' | 'firefox' | 'webkit', browserName: string) => {
    if (!disabled) {
      onBrowserChange(browserType, browserName);
    }
  }, [disabled, onBrowserChange]);

  const handleProfileToggle = useCallback((checked: boolean) => {
    if (!disabled) {
      onProfileToggle(checked);
    }
  }, [disabled, onProfileToggle]);

  const getLoginStatusText = (browserName: string) => {
    console.log('🔍 DEBUG getLoginStatusText:', {
      browserName,
      url: url.trim(),
      loginStatusKeys: Object.keys(loginStatus),
      loginStatus,
      hasLoginValue: loginStatus[browserName]
    });
    
    if (!url.trim()) return 'Profile sharing available';
    
    // If no login status data, it means URL validation failed or error occurred
    if (Object.keys(loginStatus).length === 0) {
      console.log('🔍 No login status data, returning no login detected');
      return 'No login detected';
    }
    
    const hasLogin = loginStatus[browserName];
    if (hasLogin === true) {
      console.log('🔍 Has login true, returning active profile text');
      return 'Profile appears active - may have saved logins';
    }
    if (hasLogin === false) {
      console.log('🔍 Has login false, returning no login detected');
      return 'No login detected';
    }
    console.log('🔍 Undefined login status, returning checking');
    return 'Checking...';
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
      <h3 className="text-xl font-medium text-brand-dark mb-3 text-center">
        {selectedBrowser ? 'Browser Options' : 'Choose Browser'}
      </h3>
      {!selectedBrowser && (
        <p className="text-sm text-gray-600 mb-4 text-center">
          Select a browser to get started with accessibility testing
        </p>
      )}
      
      {/* Profile Sharing Toggle - moved to top */}
      {canUseProfile && (
        <div className="mb-6">
          <div className="p-4 bg-white border rounded-lg">
            <div 
              className={`flex items-center justify-center text-sm p-2 rounded transition-colors cursor-pointer hover:shadow-sm ${
                useProfile 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-400 bg-gray-50'
              }`}
              onClick={() => handleProfileToggle(!useProfile)}
            >
              <span>Will use your existing login sessions and browser settings</span>
              <input
                type="checkbox"
                id="use-profile"
                checked={useProfile}
                onChange={(e) => handleProfileToggle(e.target.checked)}
                disabled={disabled}
                className="ml-3 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Browser Selection - 2x2 grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {availableBrowsers.map((browser) => (
            <div
              key={browser.name}
              onClick={() => handleBrowserClick(browser.type, browser.name)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedBrowser === browser.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="browser"
                value={browser.name}
                checked={selectedBrowser === browser.name}
                onChange={() => handleBrowserClick(browser.type, browser.name)}
                disabled={disabled}
                className="sr-only"
              />
              <div className="text-center">
                <div className="font-medium text-base mb-2">{browser.name}</div>
                <div className="text-sm text-gray-500">
                  {browser.available && browser.profilePath ? getLoginStatusText(browser.name) : 'Clean session only'}
                </div>
              </div>
            </div>
          ))}
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
