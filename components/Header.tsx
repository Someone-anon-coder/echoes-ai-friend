import React from 'react';
import { UserState } from '../types';
import { auth } from '../firebaseConfig';

interface HeaderProps {
  userState: UserState;
  onResetScenario: () => void;
}

const handleLogout = () => {
  auth.signOut();
};

const Header: React.FC<HeaderProps> = ({ userState, onResetScenario }) => {
  const isLoggedIn = userState.isLoggedIn;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">Aura</h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isLoggedIn && (
            <>
              <button
                onClick={onResetScenario}
                className="px-3 py-1.5 bg-red-500 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-gray-500 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-gray-600 transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;