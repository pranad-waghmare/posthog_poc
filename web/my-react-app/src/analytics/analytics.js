import posthog from "posthog-js";

// Hardcoded PostHog Configuration
const POSTHOG_KEY = "phc_8voyvBCO9Zd6RaE5cWvUh4chkTux9j2TnsRfWHU95Qe"
const POSTHOG_UI_HOST = "http://localhost:8080"
const POSTHOG_HOST = "http://localhost:5000";

class AnalyticsClass {
  constructor() {
    this.posthog = null;
    this.fiuId = null;
  }

  init(fiuId) {
    this.fiuId = fiuId || `user_${Math.random().toString(36).substr(2, 9)}`;
    this.posthog = posthog;

    this.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      ui_host: POSTHOG_UI_HOST,
      autocapture: true,
      capture_pageview: true,
      persistence: 'localStorage+cookie',
      loaded: (posthog) => {
        console.log('PostHog loaded');
        posthog.startSessionRecording();
      },
      session_recording: {
        enabled: true,
        recordCanvas: true,
        sampleRate: 1.0
      },
      capture_pageview: true,
      persistence: 'localStorage+cookie',

      // Disable any custom compression
      disable_compression: true
    });
  }

  logEvent(event) {
    if (!this.posthog || !this.fiuId) return;

    // Ensure a distinct ID is always present


    // Ensure base properties always have the required fields
    const baseProperties = {
      distinct_id: "",
      fiu_id: this.fiuId,
      $session_id: this.posthog.get_session_id() || `session_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Modify event capturing to handle different scenarios
    try {
      switch (event.type) {
        case "ScreenView":
          this.posthog.capture("$pageview", {
            screen_name: event.screenName || 'unknown_screen',
            ...baseProperties,
            ...event.properties,
          });
          break;

        case "ButtonClick":
          this.posthog.capture("button_click", {
            button_id: event.buttonId || 'unknown_button',
            button_name: event.buttonName || 'unknown_button',
            ...baseProperties,
            ...event.properties,
          });
          break;

        case "FlowCompleted":
          this.posthog.capture("flow_completed", {
            ...baseProperties,
            ...event.properties,
          });
          break;

        case "UserIdentity":
          this.posthog.identify(event.userId || distinctId, {
            ...baseProperties,
            ...event.properties,
          });
          break;

        case "Custom":
          this.posthog.capture(event.eventName || 'custom_event', {
            ...baseProperties,
            ...event.properties,
          });
          break;

        default:
          console.warn("Unknown event type:", event.type);
          this.posthog.capture(`unknown_event_${event.type}`, {
            ...baseProperties,
            original_event_type: event.type,
          });
      }
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  identify(userId, properties = {}) {
    if (!this.posthog || !this.fiuId) return;
    this.posthog.identify(userId, {
      ...properties,
      fiu_id: this.fiuId,
      distinct_id: userId // Add distinct_id
    });
  }

  reset() {
    if (!this.posthog) return;
    this.posthog.reset();
  }
}

export default new AnalyticsClass();
