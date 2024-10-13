// index.ts

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
function loadSettings(settings: ISettingRegistry.ISettings): {
  includedEvents: string[];
  enableTracking: boolean;
  loggingMethod: string;
} {
  const includedEvents =
    (settings.get('includedEvents').composite as string[]) || [];
  const enableTracking =
    (settings.get('enableTracking').composite as boolean) || false;
  const loggingMethod =
    (settings.get('loggingMethod').composite as string) || 'local';

  return {
    includedEvents,
    enableTracking,
    loggingMethod
  };
}

/**
 * Helper function to update event listeners based on the toggle and included events.
 */
function updateEventListeners(
  enableTracking: boolean,
  includedEvents: string[],
  loggingMethod: string
): void {
  console.log(
    'Updating global event listeners with included events:',
    includedEvents
  );

  // Remove existing event listeners
  if (eventLogger) {
    eventLogger.detachEventListeners();
    eventLogger = null;
  }

  // If tracking is enabled, attach new event listeners
  if (enableTracking) {
    eventLogger = new EventLogger(includedEvents, loggingMethod);
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
  description: 'A JupyterLab extension that tracks GUI interactions.',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null
  ) => {
    console.log('JupyterLab extension jupyter_tracking is activated!');

    let includedEvents: string[] = [];
    let enableTracking = false;
    let loggingMethod = 'local';

    // Load initial settings and set up listeners for changes
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('jupyter_tracking settings loaded:', settings.composite);
          console.log('The JupyterLab main application:', app);

          // Load settings
          ({ includedEvents, enableTracking, loggingMethod } =
            loadSettings(settings));
          updateEventListeners(enableTracking, includedEvents, loggingMethod);

          // Listen for settings changes
          settings.changed.connect(() => {
            ({ includedEvents, enableTracking, loggingMethod } =
              loadSettings(settings));
            updateEventListeners(enableTracking, includedEvents, loggingMethod);
          });
        })
        .catch(reason => {
          console.error(
            'Failed to load settings for jupyter_tracking.',
            reason
          );
        });
    } else {
      console.log('No settings found, tracking is disabled.');
    }
  }
};

export default plugin;
