import React from 'react';
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock the recordingApi module used by App
vi.mock('../services/recordingApi', async () => {
  const actual: any = await vi.importActual('../services/recordingApi');
  return {
    ...actual,
    profileProbe: vi.fn(),
    interactiveRelogin: vi.fn(),
    startRecordingSession: vi.fn()
  };
});

import * as recordingApi from '../services/recordingApi';

describe('pre-record flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows confirm modal when profile is locked and runs interactiveRelogin when user chooses sign-in', async () => {
    // profileProbe returns locked
    (recordingApi.profileProbe as any).mockResolvedValue({ status: 'locked' });

    // interactiveRelogin resolves with a provisionalId
    (recordingApi.interactiveRelogin as any).mockResolvedValue({ ok: true, provisionalId: 'provisional-123' });

    // startRecordingSession resolves with a fake session id
    (recordingApi.startRecordingSession as any).mockResolvedValue({ sessionId: 'session-1' });

    render(<App />);

    // Enter a URL in the input
    const input = await screen.findByPlaceholderText('Enter website URL to analyze');
    fireEvent.change(input, { target: { value: 'example.com' } });

    // Click Start button
    const startButton = screen.getByRole('button', { name: /Start/i });
    fireEvent.click(startButton);

    // Wait for confirm modal to appear
    const modalTitle = await screen.findByText('Browser profile locked');
    expect(modalTitle).toBeDefined();

    // Click the 'Sign in now' (cancel) button - the modal cancelText maps to a button we can find
    const signInNow = screen.getByRole('button', { name: /Sign in now/i });
    fireEvent.click(signInNow);

    // interactiveRelogin should be called
    await waitFor(() => {
      expect(recordingApi.interactiveRelogin).toHaveBeenCalled();
    });

    // startRecordingSession should be called eventually (after relogin resolves)
    await waitFor(() => {
      expect(recordingApi.startRecordingSession).toHaveBeenCalled();
    });
  });
});
