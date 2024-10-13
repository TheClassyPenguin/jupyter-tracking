// eventLogger.ts

class EventLogger {
    includedEvents: string[];
    activeEventTypes: string[];
    userId: string;
    initialized: boolean;
  
    constructor(includedEvents: string[] = []) {
      this.includedEvents = includedEvents;
      this.activeEventTypes = [];
      this.userId = 'unknown-user';
      this.initialized = false;
    }
  
    /**
     * Initializes the event logger by retrieving the user ID and attaching event listeners.
     */
    async init(): Promise<void> {
      if (this.initialized) {
        return;
      }
      await this.retrieveUserId();
      this.attachEventListeners();
      this.initialized = true;
    }
  
    /**
     * Retrieves the user ID, attempting to get it from JupyterHub, and falling back to localStorage.
     */
    async retrieveUserId(): Promise<void> {
      try {
        const response = await fetch('/hub/api/user', { credentials: 'same-origin' });
        if (response.ok) {
          const userData = await response.json();
          if (userData.name) {
            this.userId = userData.name;
            return;
          } else {
            await this.logInteraction(undefined, {
              type: 'IDENTIFICATION_FAILURE',
              details: 'User name not found in JupyterHub response.',
            });
          }
        } else {
          await this.logInteraction(undefined, {
            type: 'IDENTIFICATION_FAILURE',
            details: `JupyterHub API responded with status ${response.status}`,
          });
        }
      } catch (error) {
        console.warn('Could not retrieve user ID from JupyterHub:', error);
        await this.logInteraction(undefined, {
          type: 'IDENTIFICATION_ERROR',
          details: String(error), // Changed from error.toString() to String(error)
        });
      }
  
      // Fallback to localStorage
      let storedUserId = localStorage.getItem('userId');
      if (!storedUserId) {
        storedUserId = 'user-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', storedUserId);
      }
      this.userId = storedUserId;
    }
  
    /**
     * Attaches event listeners for the included events.
     */
    attachEventListeners(): void {
      if (this.includedEvents.length === 0) {
        console.warn('No events included for logging.');
        return;
      }
      this.includedEvents.forEach((eventType) => {
        document.addEventListener(eventType, this.handleEvent, true);
      });
      this.activeEventTypes = [...this.includedEvents];
      console.log('EventLogger initialized. Listening to events:', this.activeEventTypes);
    }
  
    /**
     * Detaches all currently attached event listeners.
     */
    detachEventListeners(): void {
      this.activeEventTypes.forEach((eventType) => {
        document.removeEventListener(eventType, this.handleEvent, true);
      });
      console.log('EventLogger stopped. Removed listeners for events:', this.activeEventTypes);
      this.activeEventTypes = [];
      this.initialized = false;
    }
  
    /**
     * Handles the captured events and logs the interaction.
     */
    private handleEvent = (event: Event): void => {
      const targetElement = event.target as HTMLElement;
      const interaction = {
        type: event.type,
        target: targetElement.tagName,
        targetId: targetElement.id || undefined,
        targetClass: targetElement.className || undefined,
      };
      this.logInteraction(interaction).catch((error) => {
        console.error('Error logging interaction:', error);
      });
    };
  
    /**
     * Logs the interaction or error to localStorage.
     * @param interaction The interaction details, if any.
     * @param error The error details, if any.
     */
    async logInteraction(
      interaction?: {
        type: string;
        target: string;
        targetId?: string;
        targetClass?: string;
      },
      error?: {
        type: string;
        details: string;
      }
    ): Promise<void> {
      const logEntry = {
        userId: this.userId,
        timestamp: new Date().toISOString(),
        interaction: interaction,
        error: error,
      };
      console.log('Log entry:', logEntry);
      // Store logs in localStorage
      const logs = JSON.parse(localStorage.getItem('user_interactions') || '[]');
      logs.push(logEntry);
      localStorage.setItem('user_interactions', JSON.stringify(logs));
    }
  }
  
  export default EventLogger;
  