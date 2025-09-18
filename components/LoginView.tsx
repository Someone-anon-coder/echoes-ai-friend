import React from 'react';

interface LoginViewProps {
  onGoogleSignIn: () => void;
  isLoading: boolean;
}

const LoginView: React.FC<LoginViewProps> = ({ onGoogleSignIn, isLoading }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-lg shadow-lg bg-white dark:bg-gray-800 max-w-md mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Welcome to Aura</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
        Your personal AI-powered wellness companion.
      </p>
      <p className="text-md text-gray-500 dark:text-gray-400 mb-8">
        To begin your journey, please sign in using your Google account. This allows Aura to securely access Google's Gemini API on your behalf.
      </p>
      <button
        onClick={onGoogleSignIn}
        disabled={isLoading}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
      >
        {isLoading ? 'Signing In...' : 'Sign in with Google'}
      </button>
    </div>
  );
};

export default LoginView;
