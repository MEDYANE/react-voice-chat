/**
 * Main Voice Chat Component
 * 
 * Combines all components into the complete voice chat interface
 */

import React from 'react';
import { ChatArea } from './ChatArea.jsx';
import { ControlButton } from './ControlButton.jsx';
import { StatusDisplay } from './StatusDisplay.jsx';
import styles from './VoiceChat.module.css';

export function VoiceChat() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>AI Voice Chat</h1>
            </header>

            <main className={styles.main}>
                <ChatArea />

                <div className={styles.footer}>
                    <ControlButton />
                    <StatusDisplay />
                </div>
            </main>
        </div>
    );
}
