import React, { useState } from 'react';

interface ApiKeyViewProps {
  onSave: (apiKey: string) => void;
  isLoading: boolean;
}

const ApiKeyView: React.FC<ApiKeyViewProps> = ({ onSave, isLoading }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    } else {
      alert('Please enter a valid API key.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4">
        Enter Your Gemini API Key
      </h2>
      <p className="text-base text-gray-600 dark:text-gray-300 mb-6 max-w-md">
        This application runs entirely in your browser. To use the AI features, you need to provide your own Gemini API key. Your key is stored securely in your browser's local storage and is never sent to our servers.
      </p>

      <div className="w-full max-w-sm">
        <div className="mb-4">
          <label htmlFor="apiKey" className="sr-only">Gemini API Key</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API Key"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading || !apiKey.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>

      <div className="mt-8 text-left text-sm text-gray-500 dark:text-gray-400 p-4 border-t border-gray-200 dark:border-gray-700 w-full max-w-md">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">How to get a free Gemini API key:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.</li>
          <li>Sign in with your Google account.</li>
          <li>Click on the "Get API key" button.</li>
          <li>Create a new API key in a new or existing Google Cloud project.</li>
          <li>Copy the generated key and paste it above.</li>
        </ol>
      </div>
    </div>
  );
};

export default ApiKeyView;
