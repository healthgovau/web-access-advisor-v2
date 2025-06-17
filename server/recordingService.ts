/**
 * Browser Recording Service - Phase 1 Implementation
 * Launches a real browser for user interaction and records actions
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
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
  private recordingsDir = './recordings';
  /**
   * Start a new recording session with a real browser
   */
  async startRecording(url: string, name?: string): Promise<RecordingSession> {
    // Generate human-readable timestamp-based session ID
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-MM-SS
    const sessionId = `session_${timestamp}`;
    
    // Launch browser with GUI for user interaction
    const browser = await chromium.launch({ 
      headless: false,  // User needs to see and interact with browser
      slowMo: 50        // Slight delay to make interactions more visible
    });
    
    const context = await browser.newContext({
      recordVideo: {
        dir: `./recordings/${sessionId}/`,
        size: { width: 1280, height: 720 }
      }
    });
    
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

      // Record form inputs
      document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          const selector = getSelector(e.target);
          window.recordInput(selector, e.target.value);
        }
      });

      // Record select changes
      document.addEventListener('change', (e) => {
        if (e.target.tagName === 'SELECT') {
          const selector = getSelector(e.target);
          window.recordSelect(selector, e.target.value);
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
    if (session.browser) await session.browser.close();

    console.log(`✓ Recording session ${sessionId} stopped - ${session.actions.length} actions captured`);
    console.log(`✓ Recording saved to ./recordings/${sessionId}.json`);
    
    return session;
  }

  /**
   * Save recording to disk as JSON file
   */
  private async saveRecording(session: RecordingSession, endTime: Date): Promise<void> {
    try {
      // Ensure recordings directory exists
      await mkdir(this.recordingsDir, { recursive: true });

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
      };

      // Save to file using session ID as filename
      const filePath = path.join(this.recordingsDir, `${session.sessionId}.json`);
      await writeFile(filePath, JSON.stringify(savedRecording, null, 2), 'utf8');

      console.log(`✓ Recording saved: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save recording for session ${session.sessionId}:`, error);
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): RecordingSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): RecordingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session actions
   */
  getSessionActions(sessionId: string): UserAction[] {
    const session = this.sessions.get(sessionId);
    return session?.actions || [];
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
