// Firebase initialization module
// Must be loaded AFTER firebase.config.js and Firebase SDK compat scripts

let firebaseApp;
let firebaseDatabase;

// Check if Firebase is configured
function isFirebaseConfigured() {
  return window.firebaseConfig &&
         window.firebaseConfig.apiKey &&
         window.firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE' &&
         window.firebaseConfig.databaseURL;
}

// Initialize Firebase app and database
function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] Not configured! Please fill in js/firebase.config.js with your Firebase project credentials.');
    return { configured: false, app: null, database: null };
  }

  // Initialize Firebase using compat mode (loaded via script tags)
  firebaseApp = firebase.initializeApp(window.firebaseConfig);
  firebaseDatabase = firebase.database();

  console.log('[Firebase] Initialized successfully');
  return { configured: true, app: firebaseApp, database: firebaseDatabase };
}

// Export for use in host.js and player.js
window.FirebaseInit = {
  isConfigured: isFirebaseConfigured,
  init: initFirebase,
  getDatabase: () => firebaseDatabase
};
