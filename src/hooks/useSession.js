/**
 * Custom React Hook for Session Management
 * 
 * Orchestrates the voice chat session by coordinating:
 * - Audio processing
 * - Gemini API client
 * - Transcription management
 * - Session lifecycle
 */

import { useCallback, useRef } from 'react';
import { useAudio } from './useAudio.js';
import { useGemini } from './useGemini.js';
import { useVoiceChat } from '../context/VoiceChatContext';
import { discussionStorage } from '../utils/discussionStorage.js';
import { CONFIG } from '../utils/config.js';

export function useSession() {
  const {
    setStatus,
    setActive,
    updateUserText,
    updateAIText,
    finalizeUserMessage,
    finalizeAIMessage,
    setError,
    clearError,
    resetSession,
    isActive,
  } = useVoiceChat();

  // Use refs to avoid circular dependencies and track accumulated text
  const playAudioResponseRef = useRef(null);
  const sendAudioInputRef = useRef(null);
  const cleanupAudioRef = useRef(null);
  const closeRef = useRef(null);
  const accumulatedUserTextRef = useRef('');
  const accumulatedAITextRef = useRef('');
  const userTurnFinalizedRef = useRef(false);
  const aiTurnActiveRef = useRef(false);

  /**
   * Handles incoming messages from Gemini API
   */
  const handleMessage = useCallback(async (message) => {
    const content = message.serverContent;

    if (!content) return;

    console.log('===== Received message =====');
    console.log('Full content:', JSON.stringify(content, null, 2));

    // Handle audio playback
    const audioData = content.modelTurn?.parts[0]?.inlineData?.data;
    if (audioData && playAudioResponseRef.current) {
      await playAudioResponseRef.current(audioData);
    }

    // Handle user speech transcription - API sends word-by-word updates
    if (content.inputTranscription) {
      const text = content.inputTranscription.text || '';
      console.log('User transcription chunk:', text);
      // Append the new text chunk to accumulated text
      accumulatedUserTextRef.current += text;
      console.log('Accumulated user text:', accumulatedUserTextRef.current);
      updateUserText(accumulatedUserTextRef.current);
      userTurnFinalizedRef.current = false; // Reset flag when new user speech detected
    }

    // When model starts responding, finalize user's message
    if (content.modelTurn && !userTurnFinalizedRef.current && accumulatedUserTextRef.current.trim()) {
      console.log('Model turn detected - finalizing user message');
      aiTurnActiveRef.current = true;

      // Save user message to discussion
      await discussionStorage.addMessage(accumulatedUserTextRef.current.trim(), true);

      finalizeUserMessage();
      accumulatedUserTextRef.current = '';
      userTurnFinalizedRef.current = true;
    }

    // Handle AI response transcription - API sends word-by-word updates
    if (content.outputTranscription) {
      const text = content.outputTranscription.text || '';
      console.log('AI transcription chunk:', text);
      // Append the new text chunk to accumulated text
      accumulatedAITextRef.current += text;
      console.log('Accumulated AI text:', accumulatedAITextRef.current);
      updateAIText(accumulatedAITextRef.current);
    }

    // Handle turn completion - finalize AI's message if AI was speaking
    if (content.turnComplete && aiTurnActiveRef.current) {
      console.log('Turn complete - finalizing AI message');
      if (accumulatedAITextRef.current.trim()) {
        // Save AI message to discussion
        await discussionStorage.addMessage(accumulatedAITextRef.current.trim(), false);

        finalizeAIMessage();
        accumulatedAITextRef.current = '';
      }
      aiTurnActiveRef.current = false;
    }
  }, [updateUserText, updateAIText, finalizeUserMessage, finalizeAIMessage]);

  /**
   * Handles session errors
   */
  const handleError = useCallback((error) => {
    console.error('Session error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    setError(errorMessage);
    setActive(false);
    setStatus('error');
    // Clean up on error using refs
    if (cleanupAudioRef.current) {
      cleanupAudioRef.current();
    }
    if (closeRef.current) {
      closeRef.current();
    }
  }, [setError, setActive, setStatus]);

  /**
   * Handles session close
   */
  const handleClose = useCallback(() => {
    console.log('Session closed');
    // Only update state if we were actually active
    if (isActive) {
      setActive(false);
      setStatus('idle');
    }
  }, [setActive, setStatus, isActive]);

  /**
   * Handles session open
   */
  const handleOpen = useCallback(() => {
    console.log('Session opened');
    setStatus('listening');
  }, [setStatus]);

  // Initialize Gemini with callbacks
  const { connect, sendAudioInput, close, isConnected } = useGemini(
    handleMessage,
    handleError,
    handleClose,
    handleOpen
  );

  // Store functions in refs for use in callbacks
  sendAudioInputRef.current = sendAudioInput;
  closeRef.current = close;

  // Audio processing hook - passes audio data to Gemini via ref
  const { startMicrophoneCapture, playAudioResponse, cleanup: cleanupAudio } = useAudio((audioData) => {
    if (sendAudioInputRef.current) {
      sendAudioInputRef.current(audioData);
    }
  });

  // Store audio functions in refs
  playAudioResponseRef.current = playAudioResponse;
  cleanupAudioRef.current = cleanupAudio;

  /**
   * Starts a new voice chat session with conversation name
   */
  const startSession = useCallback(async (conversationName = 'Unnamed Conversation') => {
    try {
      setStatus('connecting');
      setActive(true);
      clearError();

      // Check if API key is configured
      if (!CONFIG.API_KEY) {
        throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }

      // Start a new discussion with conversation name
      await discussionStorage.startNewDiscussion(conversationName);

      // Connect to Gemini API FIRST (before starting microphone)
      // This ensures the WebSocket is ready before we start sending audio
      console.log('Connecting to Gemini API...');
      await connect();
      console.log('Gemini API connection initiated, waiting for WebSocket to open...');

      // Wait a brief moment for the WebSocket to fully open
      // The onopen callback will set isConnectedRef to true
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start microphone capture AFTER connection is established
      const micSuccess = await startMicrophoneCapture();
      if (!micSuccess) {
        throw new Error('Failed to start microphone');
      }

      console.log('Session started successfully');

    } catch (error) {
      console.error('Failed to start session:', error);
      setError(error.message || 'Failed to start session');
      setStatus('error');
      setActive(false);
      // Clean up on error using refs
      if (cleanupAudioRef.current) {
        cleanupAudioRef.current();
      }
      if (closeRef.current) {
        closeRef.current();
      }
    }
  }, [setStatus, setActive, clearError, startMicrophoneCapture, connect, setError]);

  /**
   * Stops the current session and cleans up resources
   */
  const stopSession = useCallback(async () => {
    setActive(false);
    setStatus('idle');

    // Stop audio processing FIRST to prevent sending data to closing WebSocket
    cleanupAudio();

    // Close Gemini connection after audio is stopped
    close();

    // End the current discussion
    await discussionStorage.endCurrentDiscussion();

    // Reset transcription state
    updateUserText('');
    updateAIText('');
    accumulatedUserTextRef.current = '';
    accumulatedAITextRef.current = '';
    userTurnFinalizedRef.current = false;
    aiTurnActiveRef.current = false;
  }, [setActive, setStatus, close, cleanupAudio, updateUserText, updateAIText]);

  /**
   * Resets the entire session
   */
  const reset = useCallback(() => {
    stopSession();
    resetSession();
  }, [stopSession, resetSession]);

  return {
    startSession,
    stopSession,
    reset,
    isActive,
    isConnected: isConnected(),
  };
}