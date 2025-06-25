
import React from 'react';
import { UserState } from '../types';

interface ProfileViewProps {
  userState: UserState;
  onTogglePremium: () => void;
  onBack: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userState, onTogglePremium, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6 bg-gray-50 dark:bg-gray-800/30">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">User Profile</h2>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Status:</span>
            <span className={`px-3 py-1 text-sm font-bold rounded-full ${
              userState.isPremium 
                ? 'bg-yellow-400 text-yellow-800' 
                : 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100'
            }`}>
              {userState.isPremium ? 'Premium User' : 'Free User'}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Credits:</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">{userState.credits}</span>
          </div>
        </div>

        <button
          onClick={onTogglePremium}
          className={`w-full py-3 mb-6 font-semibold rounded-lg shadow-md transition-colors text-white ${
            userState.isPremium 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {userState.isPremium ? 'Revert to Free Account' : 'Upgrade to Premium'}
        </button>
        
        <button
          onClick={onBack}
          className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ProfileView;