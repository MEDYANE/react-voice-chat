/**
 * Custom React Hook for Gemini API Client
 * 
 * Handles all interactions with the Gemini AI API:
 * - Session initialization and configuration
 * - WebSocket connection management
 * - Message handling and event callbacks
 */

import { useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { CONFIG } from '../utils/config.js';

export function useGemini(onMessage, onError, onClose, onOpen) {
    const sessionRef = useRef(null);
    const clientRef = useRef(null);
    const isConnectedRef = useRef(false);

    /**
     * Connects to the Gemini Live API with configured callbacks
     */
    const connect = useCallback(async () => {
        try {
            // Initialize Gemini AI client
            clientRef.current = new GoogleGenAI({ apiKey: CONFIG.API_KEY });

            // Configure session settings
            const sessionConfig = {
                model: CONFIG.MODEL,
                callbacks: {
                    onopen: () => {
                        console.log('WebSocket opened successfully');
                        isConnectedRef.current = true;
                        onOpen();
                    },
                    onmessage: onMessage,
                    onerror: (error) => {
                        console.error('WebSocket error:', error);
                        isConnectedRef.current = false;
                        onError(error);
                    },
                    onclose: (event) => {
                        console.log('WebSocket closed:', event);
                        isConnectedRef.current = false;
                        onClose();
                    },
                },
                config: {
                    // Response will be in audio format
                    responseModalities: [Modality.AUDIO],

                    // Enable transcription for both input and output
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},

                    // System instructions for AI behavior
                    systemInstruction: CONFIG.SYSTEM_INSTRUCTION,
                },
            };

            // Establish WebSocket connection
            // Note: isConnectedRef will be set to true in the onopen callback
            // Don't set it here as the WebSocket might not be fully open yet
            sessionRef.current = await clientRef.current.live.connect(sessionConfig);
            return sessionRef.current;
        } catch (error) {
            console.error('Error connecting to Gemini API:', error);
            isConnectedRef.current = false;
            throw error;
        }
    }, [onMessage, onError, onClose, onOpen]);

    /**
     * Sends real-time audio input to the AI
     */
    const sendAudioInput = useCallback((audioBlob) => {
        // Only send if session exists and is connected
        if (sessionRef.current && isConnectedRef.current) {
            try {
                sessionRef.current.sendRealtimeInput({ media: audioBlob });
            } catch (error) {
                // Ignore errors when WebSocket is closing/closed
                if (error.message && (error.message.includes('CLOSING') || error.message.includes('CLOSED'))) {
                    // Silently ignore - connection is being closed
                    isConnectedRef.current = false;
                    return;
                }
                // Log other errors
                console.error('Error sending audio input:', error);
            }
        }
    }, []);

    /**
     * Closes the current session
     */
    const close = useCallback(() => {
        isConnectedRef.current = false;
        if (sessionRef.current) {
            try {
                sessionRef.current.close();
            } catch (error) {
                // Ignore errors when closing
                console.warn('Error closing session:', error);
            }
            sessionRef.current = null;
        }
    }, []);

    /**
     * Checks if a session is currently active
     */
    const isConnected = useCallback(() => {
        return sessionRef.current !== null && isConnectedRef.current;
    }, []);

    return {
        connect,
        sendAudioInput,
        close,
        isConnected,
    };
}
