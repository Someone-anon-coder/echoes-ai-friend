import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: [API_KEY],
  authDomain: [AUTH_DOMAIN],
  projectId: [PROJECT_ID],
  storageBucket: [STORAGE_BUCKET],
  messagingSenderId: [MESSAGE_SENDER_ID],
  appId: [APP_ID],
  // Make sure to add your OAuth Client ID here if you are using Google Sign-In
  // clientId: "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
