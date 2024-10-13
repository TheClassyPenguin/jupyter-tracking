import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import EventLogger from './eventLogger';

let eventLogger: EventLogger | null = null;

/**
 * Helper function to load settings or fall back to defaults.
 * If no settings are found, tracking is disabled and no events are listened to.
 */
function loadSettings(settings: ISettingRegistry.ISettings): { includedEvents: string[], enableTracking: boolean } {
  const includedEvents = settings.get('includedEvents').composite as string[] || [];
  const enableTracking = settings.get('enableTracking').composite as boolean || false; // Disable by default if not found
  
  // If no included events or tracking setting is present, disable tracking
  if (!settings.get('includedEvents').user && !settings.get('enableTracking').user) {
    return { includedEvents: [], enableTracking: false };
  }

  return { includedEvents, enableTracking };
}

/**
 * Helper function to update event listeners based on the toggle and included events.
 */
function updateEventListeners(enableTracking: boolean, includedEvents: string[]): void {
  console.log('Updating global event listeners with included events:', includedEvents);
  
  // Remove existing event listeners
  if (eventLogger) {
    eventLogger.detachEventListeners();
    eventLogger = null;
  }
  
  // If tracking is enabled, attach new event listeners
  if (enableTracking) {
    eventLogger = new EventLogger(includedEvents);
    eventLogger.init().catch(error => {
      console.error('Failed to initialize event logger:', error);
    });
  } else {
    console.log('Tracking is disabled.');
  }
}


/**
 * Initialization data for the jupyter_tracking extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter_tracking:plugin',
  description: 'A JupyterLab extension that tracks gui interactions.',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension jupyter-tracking is activated!');

    let includedEvents: string[] = [];
    let enableTracking = false; // Disable tracking by default if settings are missing

    // Load initial settings and set up listeners for changes
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('jupyter-tracking settings loaded:', settings.composite);
          console.log('The JupyterLab main application:', app);

          // Load the included events and enableTracking toggle from the settings
          ({ includedEvents, enableTracking } = loadSettings(settings));
          updateEventListeners(enableTracking, includedEvents);

          // Listen for settings changes and update includedEvents and enableTracking dynamically
          settings.changed.connect(() => {
            ({ includedEvents, enableTracking } = loadSettings(settings));
            updateEventListeners(enableTracking, includedEvents);
          });
        })
        .catch(reason => {
          console.error('Failed to load settings for jupyter-tracking.', reason);
        });
    } else {
      // If no settings are found, don't attach any listeners and disable tracking
      console.log('No settings found, tracking is disabled.');
    }
  }
};

export default plugin;
