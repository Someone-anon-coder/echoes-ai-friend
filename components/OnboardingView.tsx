
import React from 'react';
import { Scenario, AIGender, UserState } from '../types';
import { ALL_SCENARIOS } from '../constants';
import LoadingSpinner from './LoadingSpinner';

interface OnboardingViewProps {
  currentStep: 'scenario' | 'gender';
  userState: UserState;
  onScenarioSelect: (scenario: Scenario) => void;
  onGenderSelect: (gender: AIGender) => void;
  isLoading: boolean;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ currentStep, userState, onScenarioSelect, onGenderSelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600 text-lg">Setting things up...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl">
        {currentStep === 'scenario' && (
          <>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">How Will You Meet?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">Choose your first encounter. This will shape your initial interactions and your AI friend's persona.</p>
            <div className="space-y-4">
              {ALL_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => onScenarioSelect(scenario)}
                  disabled={scenario.isPremium && !userState.isPremium}
                  className={`w-full text-left p-6 border rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                    ${scenario.isPremium && !userState.isPremium 
                      ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg dark:shadow-indigo-500/30'
                    }
                    ${scenario.isPremium ? 'border-yellow-400 dark:border-yellow-500' : 'border-blue-300 dark:border-blue-600'}`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">{scenario.name}</h3>
                    {scenario.isPremium && <span className="px-3 py-1 bg-yellow-400 text-yellow-800 text-xs font-bold rounded-full">PREMIUM</span>}
                  </div>
                  <p className={`mt-2 text-sm ${scenario.isPremium && !userState.isPremium ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-100 dark:text-indigo-200'}`}>{scenario.description}</p>
                  {scenario.isPremium && !userState.isPremium && <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-medium">Premium account required</p>}
                </button>
              ))}
            </div>
          </>
        )}
        {currentStep === 'gender' && (
          <>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">Choose Your Friend's Gender</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">This will influence their name and some personality nuances.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(AIGender).map((gender) => (
                <button
                  key={gender}
                  onClick={() => onGenderSelect(gender)}
                  className="p-6 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-800 dark:shadow-teal-500/30"
                >
                  <h3 className="text-xl font-semibold text-center">{gender}</h3>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingView;