/**
 * Browser Recording Service - Phase 1 Implementation
 * Launches a real browser for user interaction and records actions
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { writeFile, mkdir, readdir, readFile, access } from 'fs/promises';
import { homedir } from 'os';
import path from 'path';
import type { UserAction } from '@web-access-advisor/core';

export interface RecordingSession {
  sessionId: string;
  url: string;
  name: string;
  startTime: Date;
  status: 'recording' | 'stopped';
  actions: UserAction[];
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  browserType?: string;
  browserName?: string;
  useProfile?: boolean;
}

export interface BrowserOption {
  type: 'chromium' | 'firefox' | 'webkit';
  name: string;
  available: boolean;
  profilePath?: string;
}

export interface RecordingOptions {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  browserName?: string;
  useProfile?: boolean;
  name?: string;
}

export interface SavedRecording {
  sessionId: string;
  sessionName: string;
  url: string;
  startTime: string;
  endTime: string;
  duration: number;
  actionCount: number;
  actions: UserAction[];
  browserType?: string;
  browserName?: string;
  useProfile?: boolean;
  metadata: {
    version: string;
    createdBy: string;
    description: string;
  };
}

export class BrowserRecordingService {
  private sessions = new Map<string, RecordingSession>();
  private snapshotsDir = './snapshots';

  /**
   * Check if user has cookies/login for a specific search term in browser profiles
   */
  async checkDomainLogin(searchTerm: string): Promise<{ [browserName: string]: boolean }> {
    console.log(`🔍 DEBUG: Starting checkDomainLogin for "${searchTerm}"`);
    const browsers = await this.detectAvailableBrowsers();
    const results: { [browserName: string]: boolean } = {};
    
    console.log(`🔍 DEBUG: Found ${browsers.length} browsers to check:`, browsers.map(b => `${b.name} (available: ${b.available})`));
    
    // Simple timeout-based approach - don't spend more than 500ms total
    const timeout = 2000; // Increased timeout for debugging
    
    const checkPromises = browsers.map(async (browser) => {
      console.log(`🔍 DEBUG: Checking ${browser.name}...`);
      
      if (!browser.available || !browser.profilePath) {
        console.log(`🔍 DEBUG: ${browser.name} - not available or no profile path (available: ${browser.available}, profilePath: ${!!browser.profilePath})`);
        results[browser.name] = false;
        return;
      }
      
      console.log(`🔍 DEBUG: ${browser.name} - profile path: ${browser.profilePath}`);
      
      try {
        // Race condition with timeout
        const hasLogin = await Promise.race([
          this.checkBrowserDomainCookies(browser, searchTerm),
          new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
        console.log(`🔍 DEBUG: ${browser.name} - login detected: ${hasLogin} for domain: ${searchTerm}`);
        results[browser.name] = hasLogin;
      } catch (error) {
        // If timeout or error, assume no login to be safe
        console.log(`🔍 DEBUG: ${browser.name} - error/timeout for domain ${searchTerm}:`, error.message);
        results[browser.name] = false;
      }
    });
    
    await Promise.allSettled(checkPromises);
    console.log(`🔍 DEBUG: Final results:`, results);
    return results;
  }

  /**
   * Check if browser has cookies for a specific domain
   */
  private async checkBrowserDomainCookies(browser: BrowserOption, searchTerm: string): Promise<boolean> {
    console.log(`🔍 DEBUG: Searching cookies for ${browser.name}, term: "${searchTerm}"`);
    
    if (!browser.profilePath) {
      console.log(`🔍 DEBUG: No profile path for ${browser.name}`);
      return false;
    }
    
    try {
      if (browser.type === 'chromium') {
        // Check Chrome/Edge cookies database for the specific domain
        const cookiesPath = path.join(browser.profilePath, 'Network', 'Cookies');
        console.log(`🔍 DEBUG: Checking cookies path: ${cookiesPath}`);
        const cookiesExists = await this.checkPathExists(cookiesPath);
        console.log(`🔍 DEBUG: Cookies file exists: ${cookiesExists}`);
        
        if (!cookiesExists) {
          console.log(`🔍 DEBUG: Cookies file doesn't exist, returning false`);
          return false;
        }
        
        // Search for the term in cookies (simplified approach)
        try {
          const fs = await import('fs');
          const cookieData = await fs.promises.readFile(cookiesPath);
          const cookieString = cookieData.toString();
          
          console.log(`🔍 DEBUG: Cookie file size: ${cookieData.length} bytes`);
          console.log(`🔍 DEBUG: Searching for domain: "${searchTerm}"`);
          
          // Check for direct domain match
          const containsTerm = cookieString.includes(searchTerm);
          console.log(`🔍 DEBUG: Direct domain match for "${searchTerm}": ${containsTerm}`);
          
          // For PowerApps Portals, also check for Microsoft SSO indicators
          if (searchTerm.includes('powerappsportals.com') || searchTerm.includes('hprgdesign-dev')) {
            console.log(`🔍 DEBUG: Detected PowerApps Portal domain, checking for Microsoft SSO indicators...`);
            
            const ssoIndicators = [
              'login.microsoftonline.com',
              '.b2clogin.com',
              'MSISAuthenticated',
              'ESTSAUTH',
              'ESTSAUTHPERSISTENT',
              'microsoftonline',
              'azure',
              'dynamics',
              // Also check for the actual domain components
              'hprgdesign-dev',
              'powerappsportals'
            ];
            
            let foundIndicator = false;
            for (const indicator of ssoIndicators) {
              if (cookieString.includes(indicator)) {
                console.log(`🔍 DEBUG: ✅ Found SSO indicator: "${indicator}"`);
                foundIndicator = true;
              } else {
                console.log(`🔍 DEBUG: ❌ No match for indicator: "${indicator}"`);
              }
            }
            
            if (foundIndicator) {
              console.log(`🔍 DEBUG: PowerApps Portal authentication detected via SSO indicators`);
              return true;
            }
          }
          
          // Check for any authentication-related cookies
          const authCookiePatterns = [
            'auth',
            'session', 
            'login',
            'token',
            'jwt',
            'bearer',
            'oauth',
            'sso'
          ];
          
          console.log(`🔍 DEBUG: Checking for general auth cookie patterns...`);
          for (const pattern of authCookiePatterns) {
            if (cookieString.toLowerCase().includes(pattern)) {
              console.log(`🔍 DEBUG: Found potential auth cookie pattern: "${pattern}"`);
            }
          }
          
          return containsTerm;
        } catch (error) {
          console.log(`🔍 DEBUG: Could not read cookies for ${browser.name}:`, error.message);
          
          // Cookie files are often locked when browsers are running
          if (error.code === 'EBUSY') {
            console.log(`🔍 DEBUG: ${browser.name} cookie file is locked - browser is currently running`);
            console.log(`🔍 DEBUG: Cannot determine login status for active browser`);
          }
          
          return false; // Default to no login detected when cookies are unreadable
        }
      }
      
      if (browser.type === 'firefox') {
        // Check Firefox cookies database for the specific domain
        const cookiesPath = path.join(browser.profilePath, 'cookies.sqlite');
        console.log(`🔍 DEBUG: Checking Firefox cookies path: ${cookiesPath}`);
        const cookiesExists = await this.checkPathExists(cookiesPath);
        console.log(`🔍 DEBUG: Firefox cookies file exists: ${cookiesExists}`);
        
        if (!cookiesExists) {
          console.log(`🔍 DEBUG: Firefox cookies file doesn't exist, returning false`);
          return false;
        }
        
        // Search for the term in Firefox cookies
        try {
          const fs = await import('fs');
          const cookieData = await fs.promises.readFile(cookiesPath);
          const containsTerm = cookieData.includes(searchTerm);
          console.log(`🔍 DEBUG: Firefox cookies contain term "${searchTerm}": ${containsTerm}`);
          return containsTerm;
        } catch (error) {
          console.log(`🔍 DEBUG: Could not read Firefox cookies for ${browser.name}:`, error.message);
          return false;
        }
      }
      
      console.log(`🔍 DEBUG: Unknown browser type: ${browser.type}`);
      return false;
    } catch (error) {
      console.log(`🔍 DEBUG: Error checking domain cookies for ${browser.name}:`, error.message);
      return false;
    }
  }

  /**
   * Detect available browsers and their profile paths on Windows
   */
  async detectAvailableBrowsers(): Promise<BrowserOption[]> {
    console.log('🔍 Starting browser detection...');
    const browsers: BrowserOption[] = [];
    const userHome = homedir();
    console.log(`🏠 User home: ${userHome}`);
    
    try {
      // Edge (Chromium-based)
      console.log('🔍 Checking Microsoft Edge...');
      const edgeProfilePath = path.join(userHome, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default');
      console.log(`📁 Edge path: ${edgeProfilePath}`);
      const edgeAvailable = await this.checkPathExistsWithTimeout(edgeProfilePath, 'Microsoft Edge');
      browsers.push({
        type: 'chromium',
        name: 'Microsoft Edge',
        available: edgeAvailable,
        profilePath: edgeAvailable ? edgeProfilePath : undefined
      });

      // Chrome
      console.log('🔍 Checking Google Chrome...');
      const chromeProfilePath = path.join(userHome, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default');
      console.log(`📁 Chrome path: ${chromeProfilePath}`);
      const chromeAvailable = await this.checkPathExistsWithTimeout(chromeProfilePath, 'Google Chrome');
      browsers.push({
        type: 'chromium',
        name: 'Google Chrome',
        available: chromeAvailable,
        profilePath: chromeAvailable ? chromeProfilePath : undefined
      });

      // Firefox
      console.log('🔍 Checking Mozilla Firefox...');
      const firefoxProfilesPath = path.join(userHome, 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles');
      console.log(`📁 Firefox profiles path: ${firefoxProfilesPath}`);
      const firefoxProfilePath = await this.findFirefoxDefaultProfileWithTimeout(firefoxProfilesPath);
      browsers.push({
        type: 'firefox',
        name: 'Mozilla Firefox',
        available: !!firefoxProfilePath,
        profilePath: firefoxProfilePath
      });

      console.log(`✅ Browser detection completed. Found ${browsers.filter(b => b.available).length} available browsers.`);
      return browsers;
    } catch (error) {
      console.error('❌ Browser detection failed:', error);
      // Return empty browsers array as fallback
      return [
        { type: 'chromium', name: 'Microsoft Edge', available: false },
        { type: 'chromium', name: 'Google Chrome', available: false },
        { type: 'firefox', name: 'Mozilla Firefox', available: false }
      ];
    }
  }

  /**
   * Check if a path exists with timeout protection
   */
  private async checkPathExistsWithTimeout(path: string, browserName: string, timeoutMs = 5000): Promise<boolean> {
    console.log(`⏱️ Checking ${browserName} path with ${timeoutMs}ms timeout...`);
    
    try {
      const result = await Promise.race([
        this.checkPathExists(path),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout checking ${browserName} path after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      
      console.log(`${result ? '✅' : '❌'} ${browserName}: ${result ? 'Available' : 'Not found'}`);
      return result;
    } catch (error) {
      console.warn(`⚠️ ${browserName} check failed:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Check if a path exists
   */
  private async checkPathExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find Firefox default profile with timeout protection
   */
  private async findFirefoxDefaultProfileWithTimeout(profilesPath: string, timeoutMs = 5000): Promise<string | null> {
    console.log(`⏱️ Searching Firefox profiles with ${timeoutMs}ms timeout...`);
    
    try {
      const result = await Promise.race([
        this.findFirefoxDefaultProfile(profilesPath),
        new Promise<string | null>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout searching Firefox profiles after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      
      console.log(`${result ? '✅' : '❌'} Firefox profile: ${result || 'Not found'}`);
      return result;
    } catch (error) {
      console.warn(`⚠️ Firefox profile search failed:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Find Firefox default profile (usually ends with .default-release)
   */
  private async findFirefoxDefaultProfile(profilesPath: string): Promise<string | null> {
    try {
      const profiles = await readdir(profilesPath);
      const defaultProfile = profiles.find(p => p.includes('.default-release')) || profiles[0];
      return defaultProfile ? path.join(profilesPath, defaultProfile) : null;
    } catch {
      return null;
    }
  }
  /**
   * Start a new recording session with browser and profile options
   */
  async startRecording(url: string, options: RecordingOptions = {}): Promise<RecordingSession> {
  const { browserType = 'chromium', browserName, useProfile = false, name, precreatedSessionId } = options as RecordingOptions & { precreatedSessionId?: string };
    
    // Generate session ID consistent with analyzer format
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let context: BrowserContext;
    let browser: Browser | undefined;
    let page: Page;
    
    try {
      if (precreatedSessionId) {
        // Use saved storageState from provisional session directory to create a clean context with auth preloaded
        const storagePath = path.join(this.snapshotsDir, precreatedSessionId, 'storageState.json');
        try {
          const stat = await readFile(storagePath, 'utf8');
          const storageObj = JSON.parse(stat);
          const browserInstance = await chromium.launch({ headless: false, slowMo: 50 });
          context = await browserInstance.newContext({ storageState: storageObj });
          page = await context.newPage();
        } catch (err) {
          console.warn('Failed to start from precreated storageState, falling back to profile/clean launch:', err instanceof Error ? err.message : String(err));
        }
      }

      if (!context) {
        if (useProfile) {
          // Use persistent context with user profile - this already opens a page
          context = await this.launchWithProfile(browserType, browserName);
          // Get the existing page from persistent context instead of creating new one
          const pages = context.pages();
          if (pages.length > 0) {
            page = pages[0];
          } else {
            page = await context.newPage();
          }
        } else {
        // Use clean browser context
        const browserInstance = await this.launchCleanBrowser(browserType, browserName);
        browser = browserInstance;
        context = await browser.newContext();
        page = await context.newPage();
        }
      }
      
      const session: RecordingSession = {
        sessionId,
        url,
        name: name || `Recording ${new Date().toLocaleString()}`,
        startTime: new Date(),
        status: 'recording',
        actions: [],
        browser,
        context,
        page,
        browserType,
        browserName,
        useProfile
      };

      // Store session
      this.sessions.set(sessionId, session);

      // Set up recording listeners
      await this.setupRecordingListeners(session);

      // Navigate to the URL only if not already there
      if (page.url() === 'about:blank' || !page.url().includes(new URL(url).hostname)) {
        await page.goto(url);
      }

      return session;
    } catch (error) {
      console.error('Failed to start recording session:', error);
      throw error;
    }
  }

  /**
   * Launch browser with persistent context (profile sharing)
   */
  private async launchWithProfile(browserType: 'chromium' | 'firefox' | 'webkit', browserName?: string): Promise<BrowserContext> {
    const browsers = await this.detectAvailableBrowsers();
    const browserOption = browsers.find(b => 
      b.type === browserType && 
      b.available &&
      (browserName ? b.name === browserName : true)
    );
    
    if (!browserOption?.profilePath) {
      throw new Error(`No profile found for ${browserName || browserType}`);
    }

    const launchOptions: any = {
      headless: false,
      slowMo: 50
    };

    switch (browserType) {
      case 'chromium':
        // Handle specific browser requirements for profile sharing
        if (browserName === 'Microsoft Edge') {
          console.log('🔍 DEBUG: Microsoft Edge selected, using Chromium for stability (Edge profile)');
          // Use Chromium with Edge profile - this combination works reliably
        } else if (browserName === 'Google Chrome') {
          console.log('🔍 DEBUG: Google Chrome selected, attempting Chrome profile sharing');
          // Chrome can be more restrictive with profile sharing
          try {
            console.log('🔍 DEBUG: Checking Chrome profile accessibility...');
            const { access } = await import('fs/promises');
            await access(browserOption.profilePath);
            console.log('✅ DEBUG: Chrome profile accessible');
            
            // For Chrome, we might need to wait a bit longer for profile unlock
            console.log('🔍 DEBUG: Adding Chrome-specific launch options...');
            launchOptions.timeout = 60000; // Longer timeout for Chrome
            launchOptions.args = [
              '--no-first-run',
              '--no-default-browser-check',
              '--disable-dev-shm-usage'
            ];
          } catch (error) {
            console.error('❌ DEBUG: Chrome profile access issue:', error);
            console.log('🔄 DEBUG: Chrome profile might be locked - will attempt launch anyway');
          }
        } else {
          console.log('🔍 DEBUG: Generic Chromium selected, using default profile');
        }
        
        console.log('🔍 DEBUG: Final launch options:', JSON.stringify(launchOptions, null, 2));
        console.log('🔍 DEBUG: Profile path:', browserOption.profilePath);
        
        try {
          const context = await chromium.launchPersistentContext(browserOption.profilePath, launchOptions);
          console.log('✅ DEBUG: Successfully launched with persistent context');
          return context;
        } catch (error) {
          console.error('❌ DEBUG: Failed to launch with persistent context:', error);
          // Provide more specific error information
          if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access')) {
              console.error('❌ DEBUG: Profile access error - browser may be running or profile locked');
            } else if (error.message.includes('permission')) {
              console.error('❌ DEBUG: Permission error - profile may be in use');
            }
          }
          // Fallback to regular browser launch if persistent context fails
          console.log('🔄 DEBUG: Attempting fallback to clean browser');
          const browser = await this.launchCleanBrowser(browserType, browserName);
          return await browser.newContext();
        }
        
      case 'firefox':
        return await firefox.launchPersistentContext(browserOption.profilePath, launchOptions);
      case 'webkit':
        // WebKit doesn't support persistent contexts, fall back to clean browser
        const browser = await webkit.launch(launchOptions);
        return await browser.newContext();
      default:
        throw new Error(`Unsupported browser type: ${browserType}`);
    }
  }

  /**
   * Launch clean browser without profile
   */
  private async launchCleanBrowser(browserType: 'chromium' | 'firefox' | 'webkit', browserName?: string): Promise<Browser> {
    const launchOptions: any = {
      headless: false,
      slowMo: 50
    };

    switch (browserType) {
      case 'chromium':
        // If browser name is specified and it's Edge, use Chrome for stability
        if (browserName === 'Microsoft Edge') {
          console.log('🔍 DEBUG: Microsoft Edge selected, using Chrome for stability');
          // Don't set executablePath - use Playwright's bundled Chromium which is more stable
        }
        console.log('🔍 DEBUG: Final launch options:', JSON.stringify(launchOptions, null, 2));
        return await chromium.launch(launchOptions);
      case 'firefox':
        return await firefox.launch(launchOptions);
      case 'webkit':
        return await webkit.launch(launchOptions);
      default:
        throw new Error(`Unsupported browser type: ${browserType}`);
    }
  }

  /**
   * Set up listeners to capture user interactions
   */
  private async setupRecordingListeners(session: RecordingSession): Promise<void> {
    const { page } = session;
    if (!page) return;

    // Record clicks
    await page.exposeFunction('recordClick', (selector: string, text?: string) => {
      this.addAction(session, {
        type: 'click',
        selector,
        value: text,
        metadata: { actionType: 'user_click' }
      });
    });

    // Record form inputs
    await page.exposeFunction('recordInput', (selector: string, value: string) => {
      this.addAction(session, {
        type: 'fill',
        selector,
        value,
        metadata: { actionType: 'user_input' }
      });
    });

    // Record selections
    await page.exposeFunction('recordSelect', (selector: string, value: string) => {
      this.addAction(session, {
        type: 'select',
        selector,
        value,
        metadata: { actionType: 'user_select' }
      });
    });

    // Record keyboard interactions
    await page.exposeFunction('recordKey', (key: string, selector: string) => {
      this.addAction(session, {
        type: 'key',
        selector,
        value: key,
        metadata: { actionType: 'keyboard_navigation' }
      });
    });

    // Record navigation
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        this.addAction(session, {
          type: 'navigate',
          url: frame.url(),
          metadata: { actionType: 'navigation' }
        });
      }
    });

    // Inject recording script into the page
    await page.addInitScript(`
      // Record clicks
      document.addEventListener('click', (e) => {
        const selector = getSelector(e.target);
        const text = e.target.textContent?.trim();
        window.recordClick(selector, text);
      });

      // Record form inputs only when field loses focus (blur)
      document.addEventListener('blur', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          const selector = getSelector(e.target);
          window.recordInput(selector, e.target.value);
        }
      }, true); // Use capture phase to ensure we catch blur events

      // Record select changes
      document.addEventListener('change', (e) => {
        if (e.target.tagName === 'SELECT') {
          const selector = getSelector(e.target);
          window.recordSelect(selector, e.target.value);
        }
      });

      // Record keyboard navigation (accessibility-critical keys)
      document.addEventListener('keydown', (e) => {
        const importantKeys = [
          'Tab',           // Focus navigation (most critical)
          'Enter',         // Activate buttons, submit forms  
          ' ',             // Space bar - activate buttons/checkboxes
          'Escape',        // Close modals, cancel operations
          'ArrowUp',       // Navigate menus, lists, custom controls
          'ArrowDown', 
          'ArrowLeft', 
          'ArrowRight',
          'Home',          // Jump to start of lists/content
          'End',           // Jump to end of lists/content
          'PageUp',        // Scroll through long content
          'PageDown'
        ];
        
        if (importantKeys.includes(e.key)) {
          const activeElement = document.activeElement || document.body;
          const selector = getSelector(activeElement);
          
          // Handle Shift+Tab specially
          const keyValue = e.shiftKey && e.key === 'Tab' ? 'Shift+Tab' : 
                          e.key === ' ' ? 'Space' : e.key;
          
          window.recordKey(keyValue, selector);
        }
      });

      // Helper function to generate selectors
      function getSelector(element) {
        if (element.id) return '#' + element.id;
        if (element.className) return '.' + element.className.split(' ')[0];
        if (element.name) return '[name="' + element.name + '"]';
        
        // Generate a more specific selector
        let selector = element.tagName.toLowerCase();
        if (element.parentElement) {
          const siblings = Array.from(element.parentElement.children);
          const index = siblings.indexOf(element);
          if (siblings.length > 1) {
            selector += ':nth-child(' + (index + 1) + ')';
          }
        }
        return selector;
      }
    `);
  }

  /**
   * Add an action to the recording session
   */
  private addAction(session: RecordingSession, action: Omit<UserAction, 'step' | 'timestamp'>): void {
    const fullAction: UserAction = {
      ...action,
      step: session.actions.length + 1,
      timestamp: new Date().toISOString()
    };

    session.actions.push(fullAction);
    console.log(`  Action recorded: ${fullAction.type} (step ${fullAction.step})`);
  }

  /**
   * Stop recording and clean up browser
   */  async stopRecording(sessionId: string): Promise<RecordingSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const endTime = new Date();
    session.status = 'stopped';

    // Save recording to disk before cleanup
    await this.saveRecording(session, endTime);

    // Close browser resources
    if (session.page) await session.page.close();
    if (session.context) await session.context.close();
    if (session.browser) await session.browser.close();    console.log(`✓ Recording session ${sessionId} stopped - ${session.actions.length} actions captured`);
    console.log(`✓ Recording saved to ./snapshots/${sessionId}/recording.json`);

    return session;
  }
  /**
   * Save recording to disk as JSON file in consolidated snapshot structure
   */
  private async saveRecording(session: RecordingSession, endTime: Date): Promise<void> {
    try {
      // Create session directory in snapshots folder
      const sessionDir = path.join(this.snapshotsDir, session.sessionId);
      await mkdir(sessionDir, { recursive: true });

      // Create the saved recording object
      const savedRecording: SavedRecording = {
        sessionId: session.sessionId,
        sessionName: session.name,
        url: session.url,
        startTime: session.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - session.startTime.getTime(),
        actionCount: session.actions.length,
        actions: session.actions,
        browserType: session.browserType,
        browserName: session.browserName,
        useProfile: session.useProfile,
        metadata: {
          version: '2.0.0',
          createdBy: 'Web Access Advisor',
          description: `Automated accessibility recording for ${session.url}`
        }
      };      // Save recording.json in the session directory (consolidated with snapshots)
      const filePath = path.join(sessionDir, 'recording.json');
      await writeFile(filePath, JSON.stringify(savedRecording, null, 2), 'utf8');

      console.log(`✓ Recording saved to: ${filePath}`);

      // If we have an active Playwright context for this session, export storageState
      try {
        if (session.context && typeof session.context.storageState === 'function') {
          const storagePath = path.join(sessionDir, 'storageState.json');
          // Export storage state (cookies + localStorage)
          await session.context.storageState({ path: storagePath });
          console.log(`✓ storageState exported to: ${storagePath}`);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to export storageState for ${session.sessionId}:`, err instanceof Error ? err.message : String(err));
      }
    } catch (error) {
      console.error(`Failed to save recording for session ${session.sessionId}:`, error);
    }
  }

  /**
   * Get storageState status for a saved session (present / expired / earliestExpiry)
   */
  async getStorageStateStatus(sessionId: string): Promise<{ present: boolean; expired: boolean | null; earliestExpiry?: number | null; message?: string }> {
    try {
      const storagePath = path.join(this.snapshotsDir, sessionId, 'storageState.json');
      // Check if file exists by attempting to read
      const raw = await readFile(storagePath, 'utf8');
      const parsed = JSON.parse(raw);

      // Playwright storageState format contains cookies array
      const cookies: any[] = Array.isArray(parsed.cookies) ? parsed.cookies : [];

      // Determine earliest expiry (cookies use epoch seconds; 0 or missing => session cookie)
      const expiries = cookies
        .map(c => (typeof c.expires === 'number' && c.expires > 0 ? c.expires : null))
        .filter((e): e is number => e !== null);

      if (expiries.length === 0) {
        return { present: true, expired: null, earliestExpiry: null, message: 'Storage state present but no cookie expiry found (session-only cookies)' };
      }

      const earliest = Math.min(...expiries);
      const expired = earliest * 1000 < Date.now();
      return { present: true, expired, earliestExpiry: earliest, message: expired ? 'Storage state appears expired' : 'Storage state valid' };
    } catch (error) {
      // File not found or unreadable
      return { present: false, expired: null, earliestExpiry: null, message: 'Storage state missing or unreadable' };
    }
  }

  /**
   * Validate storageState by creating a context, navigating to a probe URL and checking for a selector/XHR.
   * Returns elapsed time and outcome. Designed to be short-running and safe (does not log cookies).
   */
  async validateStorageState(sessionId: string, options: { probeUrl?: string; successSelector?: string; timeoutMs?: number } = {}): Promise<{ ok: boolean; elapsedMs: number; reason?: string; earliestExpiry?: number | null }>{
    const start = Date.now();
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 10000; // default 10s

    // Load saved storageState
    const storagePath = path.join(this.snapshotsDir, sessionId, 'storageState.json');
    let storageJson: any = null;
    try {
      const raw = await readFile(storagePath, 'utf8');
      storageJson = JSON.parse(raw);
    } catch (err) {
      return { ok: false, elapsedMs: Date.now() - start, reason: 'storage_state_missing' };
    }

    // Determine a probe URL: prefer provided, fall back to recorded session url
    let probeUrl = options.probeUrl;
    try {
      const session = await this.getSession(sessionId);
      if (!probeUrl && session && session.url) probeUrl = session.url;
    } catch {}
    if (!probeUrl) probeUrl = 'about:blank';

    // Use a warm browser if available (any in-memory session), otherwise cold-launch a clean browser
    let browserInstance: Browser | undefined;
    let context: BrowserContext | undefined;
    try {
      // Try reuse any existing browser instance attached to this session
      const memorySession = this.sessions.get(sessionId);
      if (memorySession && memorySession.browser) {
        browserInstance = memorySession.browser;
      }

      if (!browserInstance) {
        // Launch a clean browser (chromium) for validation - headless for speed
        browserInstance = await chromium.launch({ headless: true });
      }

      // Create a new context using the storage state object
      context = await browserInstance.newContext({ storageState: storageJson });
      const page = await context.newPage();

      // Apply navigation timeout and selector wait
      const navPromise = page.goto(probeUrl, { timeout: Math.min(timeoutMs, 30000) }).catch(e => { throw e; });
      // Use Promise.race to respect overall timeout
      await Promise.race([
        navPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('navigation_timeout')), timeoutMs))
      ]);

      if (options.successSelector) {
        await Promise.race([
          page.waitForSelector(options.successSelector, { timeout: Math.min(Math.max(1000, Math.floor(timeoutMs / 3)), timeoutMs) }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('selector_timeout')), timeoutMs))
        ]);
      }

      const elapsedMs = Date.now() - start;
      try { await context.close(); } catch {}
      // If we created a cold browser, close it
      if (browserInstance && !this.sessions.get(sessionId)) {
        try { await browserInstance.close(); } catch {}
      }

      return { ok: true, elapsedMs, earliestExpiry: Array.isArray(storageJson?.cookies) && storageJson.cookies.length ? Math.min(...storageJson.cookies.filter((c:any)=>typeof c.expires==='number'&&c.expires>0).map((c:any)=>c.expires)) : null };
    } catch (error: any) {
      try { if (context) await context.close(); } catch {}
      try { if (browserInstance && !this.sessions.get(sessionId)) await browserInstance.close(); } catch {}
      const elapsedMs = Date.now() - start;
      return { ok: false, elapsedMs, reason: error && error.message ? String(error.message) : 'probe_failed' };
    }
  }

  /**
   * Validate a storageState object (in-memory) by launching a headless browser context
   */
  async validateStorageStateObject(storageJson: any, options: { probeUrl?: string; successSelector?: string; timeoutMs?: number } = {}): Promise<{ ok: boolean; elapsedMs: number; reason?: string }> {
    const start = Date.now();
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 10000;

    try {
      // Launch a short-lived headless Chromium to validate the provided storage state
      const browserInstance = await chromium.launch({ headless: true });
      const context = await browserInstance.newContext({ storageState: storageJson });
      const page = await context.newPage();

      const probeUrl = options.probeUrl || 'about:blank';

      // Navigation with a bounded timeout
      await Promise.race([
        page.goto(probeUrl, { timeout: Math.min(timeoutMs, 30000) }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('navigation_timeout')), timeoutMs))
      ]);

      if (options.successSelector) {
        await Promise.race([
          page.waitForSelector(options.successSelector, { timeout: Math.min(Math.max(1000, Math.floor(timeoutMs / 3)), timeoutMs) }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('selector_timeout')), timeoutMs))
        ]);
      }

      const elapsedMs = Date.now() - start;
      try { await context.close(); } catch {}
      try { await browserInstance.close(); } catch {}
      return { ok: true, elapsedMs };
    } catch (error: any) {
      try { /* best-effort cleanup */ } catch {}
      return { ok: false, elapsedMs: Date.now() - start, reason: error && error.message ? String(error.message) : 'validation_failed' };
    }
  }

  /**
   * Launch an interactive persistent context so the user can sign in (re-login detour).
   * Opens browser and waits for authentication validation to succeed.
   */
  async interactiveRelogin(browserType: 'chromium' | 'firefox' | 'webkit', browserName?: string, probeUrl?: string, options: { successSelector?: string; timeoutMs?: number } = {}): Promise<{ ok: boolean; elapsedMs: number; reason?: string }>{
    const start = Date.now();
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 120000; // default 2 minutes
    const pollInterval = 3000;

    let context: BrowserContext | undefined;

    try {
      // Launch a persistent context using the user's profile so they can sign in interactively
      context = await this.launchWithProfile(browserType, browserName);

      // Ensure there is a page to navigate
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();

      // Navigate to the target URL to make signing in easier
      if (probeUrl && probeUrl !== 'about:blank') {
        try {
          await page.goto(probeUrl, { timeout: 30000 });
        } catch (err) {
          // ignore navigation failures - user can navigate manually
        }
      }

      // Poll for authentication completion
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try {
          // Grab current storage state
          const storageJson = await context.storageState();

          // Run validation to check if authentication works
          const validation = await this.validateStorageStateObject(storageJson, { 
            probeUrl, 
            successSelector: options.successSelector, 
            timeoutMs: Math.min(8000, timeoutMs) 
          });
          
          if (validation.ok) {
            const elapsedMs = Date.now() - start;
            try { await context.close(); } catch {}
            return { ok: true, elapsedMs };
          }
        } catch (err) {
          // ignore and continue polling until timeout
        }

        // Sleep before next poll
        await new Promise(r => setTimeout(r, pollInterval));
      }

      try { await context.close(); } catch {}
      return { ok: false, elapsedMs: Date.now() - start, reason: 'timeout' };
    } catch (error: any) {
      try { if (context) await context.close(); } catch {}
      return { ok: false, elapsedMs: Date.now() - start, reason: error && error.message ? String(error.message) : 'interactive_relogin_failed' };
    }
  }

  /**
   * Get session by ID - loads from disk if not in memory
   */
  async getSession(sessionId: string): Promise<RecordingSession | null> {
    // First check if session is in memory
    const memorySession = this.sessions.get(sessionId);
    if (memorySession) {
      return memorySession;
    }

    // If not in memory, try to load from disk
    try {
      const savedRecording = await this.getSavedRecording(sessionId);
      if (!savedRecording) {
        return null;
      }

      // Convert SavedRecording to RecordingSession format
      const reconstructedSession: RecordingSession = {
        sessionId: savedRecording.sessionId,
        url: savedRecording.url,
        name: savedRecording.sessionName,
        startTime: new Date(savedRecording.startTime),
        status: 'stopped', // Saved recordings are always stopped
        actions: savedRecording.actions,
        browserType: savedRecording.browserType,
        useProfile: savedRecording.useProfile,
        // Browser, context, page are undefined since this is a saved session
      };

      console.log(`📁 Loaded session ${sessionId} from disk with ${savedRecording.actions.length} actions`);
      return reconstructedSession;
    } catch (error) {
      console.error(`Failed to load session ${sessionId} from disk:`, error);
      return null;
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): RecordingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session actions - loads from disk if not in memory
   */
  async getSessionActions(sessionId: string): Promise<UserAction[]> {
    const session = await this.getSession(sessionId);
    return session?.actions || [];
  }

  /**
   * List all saved recordings from consolidated snapshot structure
   */
  async listSavedRecordings(): Promise<SavedRecording[]> {
    try {
      await mkdir(this.snapshotsDir, { recursive: true });
      const files = await readdir(this.snapshotsDir, { withFileTypes: true });
      
      const recordings: SavedRecording[] = [];
      
      // Look for session directories containing recording.json
      for (const file of files) {
        if (file.isDirectory() && file.name.startsWith('session_')) {
          try {
            const recordingPath = path.join(this.snapshotsDir, file.name, 'recording.json');
            const content = await readFile(recordingPath, 'utf8');
            const recording = JSON.parse(content) as SavedRecording;
            recordings.push(recording);
          } catch (error) {
            // Skip invalid or missing recording files
            console.warn(`Skipping invalid recording in ${file.name}:`, error);
          }
        }
      }
      
      // Sort by start time (newest first)
      return recordings.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error('Failed to list saved recordings:', error);
      return [];
    }
  }

  /**
   * Get a specific saved recording by session ID from consolidated structure
   */
  async getSavedRecording(sessionId: string): Promise<SavedRecording | null> {
    try {
      const recordingPath = path.join(this.snapshotsDir, sessionId, 'recording.json');
      const content = await readFile(recordingPath, 'utf8');
      return JSON.parse(content) as SavedRecording;
    } catch (error) {
      console.error(`Failed to get recording ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Clean up all sessions
   */
  async cleanup(): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.status === 'recording') {
        await this.stopRecording(session.sessionId);
      }
    }
    this.sessions.clear();
  }
}

// Singleton instance
export const browserRecordingService = new BrowserRecordingService();
