
import React from 'react';
import { Scenario, UserState } from '../types';
import { WELLNESS_JOURNEYS } from '../constants';
import LoadingSpinner from './LoadingSpinner';

interface OnboardingViewProps {
  userState: UserState;
  onScenarioSelect: (scenario: Scenario) => void;
  isLoading: boolean;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ userState, onScenarioSelect, isLoading }) => {
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
            {WELLNESS_JOURNEYS.map((journey) => (
              <button
                key={journey.id}
                onClick={() => onScenarioSelect(journey)}
                disabled={journey.isPremium && !userState.isPremium}
                className={`w-full text-left p-6 border rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                  ${journey.isPremium && !userState.isPremium
                    ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg dark:shadow-indigo-500/30'
                  }
                  ${journey.isPremium ? 'border-yellow-400 dark:border-yellow-500' : 'border-blue-300 dark:border-blue-600'}`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">{journey.name}</h3>
                  {journey.isPremium && <span className="px-3 py-1 bg-yellow-400 text-yellow-800 text-xs font-bold rounded-full">PREMIUM</span>}
                </div>
                <p className={`mt-2 text-sm ${journey.isPremium && !userState.isPremium ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-100 dark:text-indigo-200'}`}>{journey.description}</p>
                {journey.isPremium && !userState.isPremium && <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-medium">Premium account required</p>}
              </button>
            ))}
          </div>
        </>
      </div>
    </div>
  );
};

export default OnboardingView;