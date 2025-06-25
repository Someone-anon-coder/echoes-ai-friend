
import React, { useState } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
// It's good practice to pass the auth instance from App.tsx or initialize it here from firebaseConfig
// For simplicity here, we'll re-get it, but passing it down or using a context is better.
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebaseConfig'; // Adjust path if LoginView is moved

// Initialize Firebase app if not already initialized (idempotent)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

interface LoginViewProps {
  // onLogin is no longer needed as App.tsx listens to onAuthStateChanged
  setErrorMessage: (message: string | null) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ setErrorMessage }) => {
  const [email, setEmail] = useState(''); // Renamed from username to email
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false); // To toggle between login and sign up form appearance

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage(isSigningUp ? "Please fill in all fields to sign up." : "Please enter email and password.");
      return;
    }
    setErrorMessage(null);
    try {
      if (isSigningUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged in App.tsx will handle navigation
        console.log("User signed up successfully with email/password");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged in App.tsx will handle navigation
        console.log("User signed in successfully with email/password");
      }
    } catch (error: any) {
      console.error("Firebase auth error:", error);
      setErrorMessage(error.message || "Authentication failed. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged in App.tsx will handle navigation
      console.log("User signed in successfully with Google");
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMessage("Google Sign-In cancelled.");
      } else {
        setErrorMessage(error.message || "Google Sign-In failed. Please try again.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          {isSigningUp ? 'Create Your Echoes Account' : 'Welcome to Echoes'}
        </h2>
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="yourname@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your password"
            />
          </div>
          {/* Mock: No confirm password for sign up for simplicity */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-transform transform hover:scale-105"
          >
            {isSigningUp ? 'Sign Up & Continue' : 'Login'}
          </button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 border border-gray-300 dark:border-gray-500 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g-image class="ng-tns-c2426067642-2" height="24" width="24" alt="" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"></g-image><path d="M22.56,12.25C22.56,11.47 22.49,10.72 22.36,10H12V14.5H18.36C18.04,16.03 17.27,17.31 16.07,18.15V20.69H19.73C21.58,19.05 22.56,16.83 22.56,14.08C22.56,13.46 22.56,12.86 22.56,12.25Z" fill="#4285F4"></path><path d="M12,24C15.24,24 17.97,22.91 19.73,21.19L16.07,18.65C14.99,19.36 13.62,19.75 12,19.75C9.12,19.75 6.65,17.9 5.56,15.38H1.79V17.92C3.58,21.34 7.46,24 12,24Z" fill="#34A853"></path><path d="M5.56,14.88C5.34,14.31 5.22,13.76 5.22,13.2C5.22,12.64 5.33,12.09 5.56,11.52V8.98H1.79C1.22,10.03 1,11.35 1,12.72C1,14.09 1.22,15.31 1.79,16.46L5.56,14.88Z" fill="#FBBC05"></path><path d="M12,5.25C13.74,5.25 15.08,5.86 15.91,6.65L19.79,2.78C17.97,1.06 15.24,0 12,0C7.46,0 3.58,2.66 1.79,6.08L5.56,8.62C6.65,6.1 9.12,5.25 12,5.25Z" fill="#EA4335"></path></svg>
            Sign in with Google
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {isSigningUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => {setIsSigningUp(!isSigningUp); setErrorMessage(null);}}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {isSigningUp ? 'Login here' : 'Sign up now'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginView;