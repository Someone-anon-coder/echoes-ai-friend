
import React from 'react';
import { Journey, UserState } from '../types';
import { JOURNEY_DEFINITIONS } from '../constants';
import LoadingSpinner from './LoadingSpinner';

interface JourneySelectionViewProps {
  userState: UserState;
  onJourneySelect: (journey: Journey) => void;
  isLoading: boolean;
}

const JourneySelectionView: React.FC<JourneySelectionViewProps> = ({ userState, onJourneySelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50 dark:bg-gray-800">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">Aura is preparing for your session...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl">
        <>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">Begin Your Wellness Journey</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">Choose a path to start your conversation with Aura, your personal wellness companion.</p>
          <div className="space-y-4">
            {JOURNEY_DEFINITIONS.map((journey) => (
              <button
                key={journey.id}
                onClick={() => onJourneySelect(journey)}
                className={`w-full text-left p-6 border rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                   bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg dark:shadow-indigo-500/30
                   border-blue-300 dark:border-blue-600`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">{journey.name}</h3>
                </div>
                <p className={`mt-2 text-sm text-indigo-100 dark:text-indigo-200`}>{journey.description}</p>
              </button>
            ))}
          </div>
        </>
      </div>
    </div>
  );
};

export default JourneySelectionView;