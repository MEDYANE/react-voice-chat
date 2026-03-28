/**
 * Discussion Storage Utility
 * 
 * Handles saving and loading discussion history using localStorage
 */

const STORAGE_KEY = 'voice_chat_discussions';
const CURRENT_DISCUSSION_KEY = 'voice_chat_current_discussion';

/**
 * Discussion data structure
 */
export class Discussion {
    constructor() {
        this.id = Date.now();
        this.startTime = new Date().toISOString();
        this.endTime = null;
        this.messages = [];
    }

    /**
     * Add a message to the discussion
     */
    addMessage(text, isUser, timestamp = new Date().toISOString()) {
        this.messages.push({
            id: Date.now() + Math.random(),
            text,
            isUser,
            timestamp
        });
    }

    /**
     * Mark discussion as ended
     */
    endDiscussion() {
        this.endTime = new Date().toISOString();
    }
}

/**
 * Discussion Storage Manager
 */
export class DiscussionStorage {
    constructor() {
        this.currentDiscussion = null;
        this.loadCurrentDiscussion();
    }

    /**
     * Get all discussions from localStorage
     */
    getAllDiscussionsFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    /**
     * Save all discussions to localStorage
     */
    saveAllDiscussionsToStorage(discussions) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(discussions));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                alert('Storage limit exceeded. Please export and clear old discussions.');
            }
        }
    }

    /**
     * Load current discussion from localStorage
     */
    loadCurrentDiscussion() {
        try {
            const stored = localStorage.getItem(CURRENT_DISCUSSION_KEY);
            this.currentDiscussion = stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error loading current discussion:', error);
            this.currentDiscussion = null;
        }
    }

    /**
     * Save current discussion to localStorage
     */
    saveCurrentDiscussion() {
        try {
            if (this.currentDiscussion) {
                localStorage.setItem(CURRENT_DISCUSSION_KEY, JSON.stringify(this.currentDiscussion));
            } else {
                localStorage.removeItem(CURRENT_DISCUSSION_KEY);
            }
        } catch (error) {
            console.error('Error saving current discussion:', error);
        }
    }

    /**
     * Start a new discussion with conversation name
     */
    async startNewDiscussion(conversationName = 'Unnamed Conversation') {
        try {
            const newDiscussion = {
                id: Date.now(),
                user_id: 'local',
                conversation_name: conversationName,
                start_time: new Date().toISOString(),
                end_time: null,
                messages: []
            };

            // Save to all discussions
            const allDiscussions = this.getAllDiscussionsFromStorage();
            allDiscussions.push(newDiscussion);
            this.saveAllDiscussionsToStorage(allDiscussions);

            // Set as current discussion
            this.currentDiscussion = newDiscussion;
            this.saveCurrentDiscussion();

            return newDiscussion;
        } catch (error) {
            console.error('Error creating discussion:', error);
            return null;
        }
    }

    /**
     * Add a message to the current discussion
     */
    async addMessage(text, isUser) {
        if (!this.currentDiscussion) return;

        try {
            const newMessage = {
                id: Date.now() + Math.random(),
                text,
                isUser,
                timestamp: new Date().toISOString()
            };

            this.currentDiscussion.messages.push(newMessage);
            this.saveCurrentDiscussion();

            // Update in all discussions
            const allDiscussions = this.getAllDiscussionsFromStorage();
            const discussionIndex = allDiscussions.findIndex(d => d.id === this.currentDiscussion.id);
            if (discussionIndex !== -1) {
                allDiscussions[discussionIndex] = { ...this.currentDiscussion };
                this.saveAllDiscussionsToStorage(allDiscussions);
            }
        } catch (error) {
            console.error('Error adding message:', error);
        }
    }

    /**
     * End the current discussion
     */
    async endCurrentDiscussion() {
        if (!this.currentDiscussion) return null;

        try {
            this.currentDiscussion.end_time = new Date().toISOString();

            // Update in all discussions
            const allDiscussions = this.getAllDiscussionsFromStorage();
            const discussionIndex = allDiscussions.findIndex(d => d.id === this.currentDiscussion.id);
            if (discussionIndex !== -1) {
                allDiscussions[discussionIndex] = { ...this.currentDiscussion };
                this.saveAllDiscussionsToStorage(allDiscussions);
            }

            const endedDiscussion = this.currentDiscussion;
            this.currentDiscussion = null;
            this.saveCurrentDiscussion();

            return endedDiscussion;
        } catch (error) {
            console.error('Error ending discussion:', error);
            return null;
        }
    }


    /**
     * Get all discussions
     */
    async getAllDiscussions() {
        try {
            const allDiscussions = this.getAllDiscussionsFromStorage();
            // Sort by start_time descending (newest first)
            return allDiscussions.sort((a, b) => 
                new Date(b.start_time) - new Date(a.start_time)
            );
        } catch (error) {
            console.error('Error fetching discussions:', error);
            return [];
        }
    }

    /**
     * Export discussions as downloadable JSON file
     */
    async exportDiscussions() {
        try {
            const discussions = await this.getAllDiscussions();
            const dataStr = JSON.stringify(discussions, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `discussions_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting discussions:', error);
        }
    }

    /**
     * Clear all discussions
     */
    async clearAllDiscussions() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(CURRENT_DISCUSSION_KEY);
            this.currentDiscussion = null;
            return true;
        } catch (error) {
            console.error('Error clearing discussions:', error);
            return false;
        }
    }
}

// Create a singleton instance
export const discussionStorage = new DiscussionStorage();
