import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZs5BrsALiTRWi2ON7S_ID7BXDqTTzno8",
  authDomain: "aura-wellness-hackathon-472215.firebaseapp.com",
  projectId: "aura-wellness-hackathon-472215",
  storageBucket: "aura-wellness-hackathon-472215.firebasestorage.app",
  messagingSenderId: "926187786081",
  appId: "1:926187786081:web:20a0fb47f1032dc9113f20",
  // Make sure to add your OAuth Client ID here if you are using Google Sign-In
  // clientId: "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
