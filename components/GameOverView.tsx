
import React from 'react';
import { AIPersona } from '../types';

interface GameOverViewProps {
  aiPersona: AIPersona | null;
  onReset: () => void;
}

const GameOverView: React.FC<GameOverViewProps> = ({ aiPersona, onReset }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-center">
      <div className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-xl shadow-2xl max-w-lg">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-red-500 mx-auto mb-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Connection Lost</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
          It seems you and {aiPersona?.name || 'your friend'} have drifted apart. The connection has been broken.
        </p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Sometimes friendships fade, but every ending is a new beginning. You can always start a new journey.
        </p>
        <button
          onClick={onReset}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
        >
          Start a New Scenario
        </button>
      </div>
    </div>
  );
};

export default GameOverView;