/**
 * Browser selection component for choosing browser and profile options
 */

import { useState, useEffect, useCallback, forwardRef, useRef } from 'react';
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
  
  // Check if any browser supports profiles to show the authentication bar early
  const anyBrowserSupportsProfile = browsers.some(b => b.available && b.profilePath);

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
      : 'Not using browser profile';
  };

  // Refs and state for controlled popovers that can flip when off-screen
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const popupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showPopovers, setShowPopovers] = useState<Record<string, boolean>>({});
  const [popoverPlacement, setPopoverPlacement] = useState<Record<string, 'top' | 'bottom'>>({});

  // Close popovers when clicking outside any button or popup
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      // If click is inside any popup or button, do nothing
      for (const name of Object.keys(btnRefs.current)) {
        const btn = btnRefs.current[name];
        const pop = popupRefs.current[name];
        if (btn && btn.contains(target)) return;
        if (pop && pop.contains(target)) return;
      }

      // Otherwise close all popovers
      setShowPopovers({});
    };

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

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

  const showPopover = (name: string) => {
    setShowPopovers(prev => ({ ...prev, [name]: true }));
    // measure on next frame; if measurement appears invalid, fallback to bottom placement
    requestAnimationFrame(() => {
      const btn = btnRefs.current[name];
      const pop = popupRefs.current[name];
      if (!btn || !pop) return;
      const btnRect = btn.getBoundingClientRect();
      const popRect = pop.getBoundingClientRect();
      const spaceAbove = btnRect.top;
      // If measurement failed (0 height) or not enough space above, place below
      if (!popRect.height || spaceAbove < popRect.height + 8) {
        setPopoverPlacement(prev => ({ ...prev, [name]: 'bottom' }));
      } else {
        setPopoverPlacement(prev => ({ ...prev, [name]: 'top' }));
      }
    });
  };

  const hidePopover = (name: string) => {
    setShowPopovers(prev => ({ ...prev, [name]: false }));
  };

  // Robust toggle that measures placement when opening
  const togglePopover = (name: string) => {
    setShowPopovers(prev => {
      const opening = !prev[name];
      if (opening) {
        // measure after render
        requestAnimationFrame(() => {
          const btn = btnRefs.current[name];
          const pop = popupRefs.current[name];
          if (!btn || !pop) return;
          const btnRect = btn.getBoundingClientRect();
          const popRect = pop.getBoundingClientRect();
          const spaceAbove = btnRect.top;
          if (!popRect.height || spaceAbove < popRect.height + 8) {
            setPopoverPlacement(prev2 => ({ ...prev2, [name]: 'bottom' }));
          } else {
            setPopoverPlacement(prev2 => ({ ...prev2, [name]: 'top' }));
          }
        });
      }
      return { ...prev, [name]: opening };
    });
  };
  
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
      
      {/* Profile Sharing Toggle - show early to prevent layout shift */}
      {anyBrowserSupportsProfile && (
        <div className="mb-6">
            <div className="p-4 bg-white border rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className={`flex-1 flex items-center justify-between text-sm p-2 rounded transition-colors cursor-pointer ${
                  disabled || sessionMode === 'load'
                    ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                    : useProfile 
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                      : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => sessionMode === 'new' && !disabled && handleProfileToggle(!useProfile)}
              >
                <span className="flex-1 text-center">
                  {sessionMode === 'load' 
                    ? 'Recorded with authentication - ensure you are logged in'
                    : useProfile
                      ? 'Will use your existing login sessions and browser settings'
                      : 'Will use clean browser session (sign in during recording if needed)'
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
              
              {/* removed global popover - replaced with per-browser popovers in the browser grid below */}
            </div>
          </div>
        </div>
      )}
      
      {/* Browser Selection - 2x2 grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {availableBrowsers.map((browser) => {
            // In `load` (replay) mode we disable browsers except the one used by the loaded session.
            // This keeps the active/selected browser (if any) interactive so its popover isn't dimmed.
            const isBrowserDisabled = disabled || (sessionMode === 'load' && browser.name !== selectedBrowser);
            const isSelected = selectedBrowser === browser.name;
            const showSelection = isSelected; // Show selection in both new and load modes
            
              return (
              <div
                key={browser.name}
                onClick={() => handleBrowserClick(browser.type, browser.name)}
                className={`relative p-4 border-2 rounded-lg transition-colors ${
                  showSelection
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${!isBrowserDisabled ? 'cursor-pointer' : 'cursor-default'}`}
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
                      : sessionMode === 'load' && selectedBrowser && browser.name === selectedBrowser
                        ? `Used in this session${useProfile ? ' with profile' : ' without profile'}`
                        : sessionMode === 'load' && selectedBrowser && browser.name !== selectedBrowser
                          ? 'Not used in this session'
                          : getProfileStatusText(browser)
                    }
                  </div>
                  {/* Per-browser info popover (top-right of card) */}
                  <div className="absolute top-2 right-2">
                    <div className="relative">
                      <button
                        ref={(el) => { btnRefs.current[browser.name] = el }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // allow popovers to open even for replayed/disabled cards so users can read instructions
                          togglePopover(browser.name);
                        }}
                        onFocus={() => { showPopover(browser.name) }}
                        onMouseEnter={() => { showPopover(browser.name) }}
                        onMouseLeave={() => { hidePopover(browser.name) }}
                        onKeyDown={(e) => {
                          // Allow keyboard toggles regardless of card disabled state
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            togglePopover(browser.name);
                          }
                        }}
                        type="button"
                        aria-label={`Show ${browser.name} instructions`}
                        aria-expanded={!!showPopovers[browser.name]}
                        className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-full bg-white p-1 cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-gray-500 hover:text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div
                        ref={(el) => { popupRefs.current[browser.name] = el }}
                        role="dialog"
                        aria-label={`${browser.name} instructions`}
                        className={`absolute z-50 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 transition-all duration-150 text-sm leading-relaxed ${showPopovers[browser.name] ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                        style={popoverPlacement[browser.name] === 'top' ? { bottom: 'calc(100% + 8px)', right: 0 } : { top: 'calc(100% + 8px)', right: 0 }}
                      >
                        <div className="space-y-3 text-left">
                          {sessionMode === 'new' ? (
                            // Recording instructions (non-technical)
                            browser.type === 'firefox' ? (
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">Recording — Firefox</div>
                                  <ul className="list-disc list-inside text-gray-700 pl-4 space-y-1">
                                    <li>Open Firefox and sign in to the website you want to test.</li>
                                    <li>Avoid private or incognito windows — use a normal window so your login is saved.</li>
                                    <li>Return here and start the recording.</li>
                                  </ul>
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">Recording — {browser.name}</div>
                {browser.name && browser.name.includes('Edge') ? (
                                  <ul className="list-disc list-inside text-gray-700 pl-4 space-y-1">
                                    <li>Make sure you are already signed in to the website in Microsoft Edge.</li>
                                    <li>Avoid private or incognito windows — use a normal window so your login is saved.</li>
                                    <li>Return here and start the recording. You do not need to sign in while recording.</li>
                                  </ul>
                ) : browser.type === 'chromium' && !browser.name.includes('Edge') ? (
                                  <ul className="list-disc list-inside text-gray-700 pl-4 space-y-1">
                                    <li>Avoid private or incognito windows — use a normal window so your login is saved.</li>
                                    <li>If no saved login (storage state) exists, we will open your browser so you can sign in before recording starts — complete the sign-in and the recording will begin automatically.</li>
                                    <li>After signing in we validate the saved login; recording will only start once validation succeeds.</li>
                                  </ul>
                                ) : (
                                  <ol className="list-decimal list-inside text-gray-700 ml-3">
                                    <li>Open {browser.name} and sign in to the website you want to test.</li>
                                    <li>Avoid private or incognito windows — use a normal window so your login is saved.</li>
                                    <li>You may need to sign in during recording if you are not already signed in.</li>
                                  </ol>
                                )}
                              </div>
                            )
                          ) : (
                            // Replay instructions (non-technical)
                            browser.type === 'firefox' ? (
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">Replay — Firefox</div>
                                <ul className="list-disc list-inside text-gray-700 pl-4 space-y-1">
                                  <li>Open Firefox and make sure you are signed in to the website.</li>
                                  <li>In the replay controls, click "Validate" to check your login.</li>
                                  <li>If validation fails, sign in again in the browser and retry validation.</li>
                                </ul>
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">Replay — {browser.name}</div>
                                {browser.type === 'chromium' && !browser.name.includes('Edge') ? (
                                  <ul className="list-disc list-inside text-gray-700 pl-4 space-y-1">
                                    <li>Open {browser.name} and sign in to the website you want to test.</li>
                                    <li>Click "Validate" in the replay controls to confirm your saved login (storage state) is usable.</li>
                                    <li>If validation fails, click "Re-login" — this opens the browser so you can sign in; once signed in we'll save a new login state for the session so replays can reuse it. Then click "Validate" again.</li>
                                  </ul>
                                ) : (
                                  <ol className="list-decimal list-inside text-gray-700 ml-3">
                                    <li>Open {browser.name} and make sure you are signed in to the website.</li>
                                    <li>In the replay controls, click "Validate" to check your login.</li>
                                    <li>If validation fails, sign in again in the browser and retry validation.</li>
                                  </ol>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
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
