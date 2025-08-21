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
    const browsers = await this.detectAvailableBrowsers();
    const results: { [browserName: string]: boolean } = {};
    
    // Simple timeout-based approach - don't spend more than 500ms total
    const timeout = 100; // 100ms per browser max
    
    const checkPromises = browsers.map(async (browser) => {
      if (!browser.available || !browser.profilePath) {
        results[browser.name] = false;
        return;
      }
      
      try {
        // Race condition with timeout
        const hasLogin = await Promise.race([
          this.checkBrowserDomainCookies(browser, searchTerm),
          new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
        results[browser.name] = hasLogin;
      } catch (error) {
        // If timeout or error, assume no login to be safe
        results[browser.name] = false;
      }
    });
    
    await Promise.allSettled(checkPromises);
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
          const containsTerm = cookieData.includes(searchTerm);
          console.log(`🔍 DEBUG: Cookies contain term "${searchTerm}": ${containsTerm}`);
          return containsTerm;
        } catch (error) {
          console.log(`🔍 DEBUG: Could not read cookies for ${browser.name}:`, error.message);
          return false;
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
    const browsers: BrowserOption[] = [];
    const userHome = homedir();
    
    // Edge (Chromium-based)
    const edgeProfilePath = path.join(userHome, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default');
    const edgeAvailable = await this.checkPathExists(edgeProfilePath);
    browsers.push({
      type: 'chromium',
      name: 'Microsoft Edge',
      available: edgeAvailable,
      profilePath: edgeAvailable ? edgeProfilePath : undefined
    });

    // Chrome
    const chromeProfilePath = path.join(userHome, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default');
    const chromeAvailable = await this.checkPathExists(chromeProfilePath);
    browsers.push({
      type: 'chromium',
      name: 'Google Chrome',
      available: chromeAvailable,
      profilePath: chromeAvailable ? chromeProfilePath : undefined
    });

    // Firefox
    const firefoxProfilesPath = path.join(userHome, 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles');
    const firefoxProfilePath = await this.findFirefoxDefaultProfile(firefoxProfilesPath);
    browsers.push({
      type: 'firefox',
      name: 'Mozilla Firefox',
      available: !!firefoxProfilePath,
      profilePath: firefoxProfilePath
    });

    return browsers;
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
    const { browserType = 'chromium', browserName, useProfile = false, name } = options;
    
    // Generate session ID consistent with analyzer format
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let context: BrowserContext;
    let browser: Browser | undefined;
    let page: Page;
    
    try {
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
        // If browser name is specified and it's Edge, try Edge first but fallback to Chrome
        if (browserName === 'Microsoft Edge') {
          console.log('🔍 DEBUG: Microsoft Edge selected, but using Chrome for stability');
          // Don't set executablePath - let Playwright use its bundled Chromium
          // This gives us Edge-like experience with better stability
        }
        
        console.log('🔍 DEBUG: Final launch options:', JSON.stringify(launchOptions, null, 2));
        
        try {
          return await chromium.launchPersistentContext(browserOption.profilePath, launchOptions);
        } catch (error) {
          console.error('❌ DEBUG: Failed to launch with persistent context:', error);
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
    } catch (error) {
      console.error(`Failed to save recording for session ${session.sessionId}:`, error);
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
