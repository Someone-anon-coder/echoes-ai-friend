
import React from 'react';
import { UserState, GameState, AppScreen } from '../types';

interface HeaderProps {
  userState: UserState;
  gameState: GameState | null;
  onResetScenario: () => void;
  onLogout: () => void; // New prop for logout
  currentScreen: AppScreen;
  navigateTo: (screen: AppScreen) => void; 
}

const Header: React.FC<HeaderProps> = ({ userState, gameState, onResetScenario, onLogout, currentScreen, navigateTo }) => {
  const isMenuScreen = currentScreen === AppScreen.PROFILE || currentScreen === AppScreen.SHOP;
  const isLoggedIn = userState.isLoggedIn;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">Echoes</h1>
          {isLoggedIn && (
            <>
              <button
                onClick={() => navigateTo(AppScreen.PROFILE)}
                disabled={currentScreen === AppScreen.PROFILE}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  currentScreen === AppScreen.PROFILE 
                    ? 'bg-blue-500 text-white cursor-default' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-200 dark:hover:bg-blue-700'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => navigateTo(AppScreen.SHOP)}
                disabled={currentScreen === AppScreen.SHOP}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  currentScreen === AppScreen.SHOP 
                    ? 'bg-green-500 text-white cursor-default' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-green-200 dark:hover:bg-green-700'
                }`}
              >
                Shop
              </button>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isLoggedIn && (
            <>
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">Credits:</span> {userState.credits}
                {userState.isPremium && <span className="ml-1 px-2 py-0.5 bg-yellow-400 text-yellow-800 text-xs font-semibold rounded-full">PREMIUM</span>}
              </div>
              {(currentScreen === AppScreen.CHATTING || currentScreen === AppScreen.GAME_OVER) && !isMenuScreen && (
                <button
                  onClick={onResetScenario}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
                >
                  Reset Scenario
                </button>
              )}
              <button
                onClick={onLogout}
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