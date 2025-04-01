import analytics from "./analytics";

// Event Types
export const AnalyticsEvent = {
  ScreenView: (screenName, properties = {}) => ({
    type: "ScreenView",
    screenName,
    properties,
  }),
  ButtonClick: (buttonId, buttonName, properties = {}) => ({
    type: "ButtonClick",
    buttonId,
    buttonName,
    properties,
  }),
  FlowCompleted: (properties = {}) => ({
    type: "FlowCompleted",
    properties,
  }),
  UserIdentity: (userId, properties = {}) => ({
    type: "UserIdentity",
    userId,
    properties,
  }),
  Custom: (eventName, properties = {}) => ({
    type: "Custom",
    eventName,
    properties,
  }),
};

// Initialize Analytics (Customers pass only fiuId)
export const initAnalytics = (fiuId) => {
  analytics.init(fiuId);
};

// Log Events
export const logEvent = (event) => {
  analytics.logEvent(event);
};

// Identify User
export const identifyUser = (userId, properties = {}) => {
  analytics.identify(userId, properties);
};

// Reset Analytics
export const resetUser = () => {
  analytics.reset();
};
