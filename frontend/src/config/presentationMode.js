/**
 * PRESENTATION MODE CONFIGURATION
 * 
 * Set PRESENTATION_MODE to true to show only:
 * - Public Landing Page
 * - Register Page
 * - Login Page
 * - Dashboard (after login)
 * 
 * Set to false to show all features
 */

export const PRESENTATION_MODE = false; // Change to false after presentation

export const PRESENTATION_CONFIG = {
  // Features visible in presentation mode
  enabledFeatures: {
    publicLanding: true,
    register: true,
    login: true,
    verifyOTP: true,
    dashboard: true
  },
  
  // All other features (will be hidden in presentation mode)
  hiddenFeatures: {
    dashboard: false,
    matches: false,
    contests: false,
    teamBuilder: false,
    wallet: false,
    news: false,
    rankings: false,
    schedule: false,
    tournaments: false,
    players: false,
    series: false,
    stats: false
  }
};

// Helper function to check if a feature should be shown
export const isFeatureEnabled = (featureName) => {
  if (!PRESENTATION_MODE) return true; // All features enabled when not in presentation mode
  return PRESENTATION_CONFIG.enabledFeatures[featureName] === true;
};
