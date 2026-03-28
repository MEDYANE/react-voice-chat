/**
 * Configuration Module for React Voice Chat
 * 
 * Centralizes all application configuration settings.
 * In production, these values would be loaded from environment variables.
 */

export const CONFIG = {
    // API Configuration
    // IMPORTANT: Set your API key in a .env file as VITE_GEMINI_API_KEY
    // Get your API key from: https://aistudio.google.com/apikey
    API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    MODEL: 'gemini-2.5-flash-native-audio-preview-09-2025',

    // Audio Settings
    AUDIO: {
        INPUT_SAMPLE_RATE: 16000,    // 16kHz for microphone input
        OUTPUT_SAMPLE_RATE: 24000,   // 24kHz for AI audio output
        BUFFER_SIZE: 4096,           // Audio processing buffer size
        CHANNELS: 1,                 // Mono audio
    },

    // AI System Instructions — General AI Assistant
    SYSTEM_INSTRUCTION:
        'You are a helpful, friendly, and conversational AI assistant. You engage in natural, flowing conversations with users through voice chat.\n\n' +
        'Your role:\n' +
        '- Be conversational and engaging\n' +
        '- Keep responses concise and natural for voice interaction (typically 10-30 seconds)\n' +
        '- Listen actively and respond thoughtfully to what the user says\n' +
        '- Ask follow-up questions to keep the conversation going\n' +
        '- Be helpful, informative, and friendly\n' +
        '- Adapt your communication style to match the user\'s tone and needs\n\n' +
        'Guidelines:\n' +
        '- Speak naturally as if having a real conversation\n' +
        '- Don\'t be overly formal or robotic\n' +
        '- Show genuine interest in the conversation\n' +
        '- Provide helpful information when asked\n' +
        '- Be respectful and considerate\n' +
        '- If you don\'t know something, say so honestly\n\n' +
        'Start conversations warmly and naturally. Be ready to discuss any topic the user brings up.\n',

    // UI Messages
    MESSAGES: {
        WELCOME: '👋 Hi! Click "Start Chat" to begin talking with me.',
        CONNECTING: 'Connecting...',
        LISTENING: '🎤 Listening... Speak now!',
        ERROR: '❌ Error occurred',
        READY: 'Ready to chat',
    },
};
