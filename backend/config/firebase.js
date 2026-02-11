const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  try {
    // Load service account from JSON file
    const serviceAccount = require('../serviceAccountKey.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
    });

    console.log('✅ Firebase Admin initialized successfully');
    console.log(`🔥 Project: ${serviceAccount.project_id}`);
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

/**
 * Get Firebase Realtime Database reference
 */
const getDatabase = () => {
  return admin.database();
};

/**
 * Get Firebase Admin Auth
 */
const getAuth = () => {
  return admin.auth();
};

module.exports = {
  initializeFirebase,
  getDatabase,
  getAuth,
  admin
};
