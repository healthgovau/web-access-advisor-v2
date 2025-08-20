/**
 * Browser Recording Service - Phase 1 Implementation
 * Launches a real browser for user interaction and records actions
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
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
   * Start a new recording session with a real browser
   */
  async startRecording(url: string, name?: string): Promise<RecordingSession> {    // Generate session ID consistent with analyzer format
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Launch browser with GUI for user interaction
    const browser = await chromium.launch({ 
      headless: false,  // User needs to see and interact with browser
      slowMo: 50        // Slight delay to make interactions more visible
    });
    
    // Create context without video recording
    const context = await browser.newContext();
    
    const page = await context.newPage();
    
    const session: RecordingSession = {
      sessionId,
      url,
      name: name || `Recording ${new Date().toLocaleString()}`,
      startTime: new Date(),
      status: 'recording',
      actions: [],
      browser,
      context,
      page
    };

    // Set up action recording listeners
    await this.setupRecordingListeners(session);
    
    // Navigate to the target URL
    await page.goto(url);
    
    // Record the initial navigation action
    this.addAction(session, {
      type: 'navigate',
      url: url,
      metadata: { initialLoad: true }
    });

    this.sessions.set(sessionId, session);
    
    console.log(`✓ Recording session ${sessionId} started - Browser launched for ${url}`);
    return session;
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
