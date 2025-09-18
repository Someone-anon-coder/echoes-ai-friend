
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from './firebaseConfig';
import {
  AppScreen,
  UserState,
  GameState,
  Scenario,
  AIPersona,
  ChatMessage,
} from './types';
import {
  INITIAL_RELATIONSHIP_SCORE,
  // FREE_USER_INITIAL_CREDITS, // This is now managed in firestoreService
} from './constants';
import {
  getUserProfile,
  createUserProfile,
  getActiveSession,
  saveSession,
  updateUserProfile,
} from './services/firestoreService';
import {
  generateAIPersonaService,
  // generateAIChatResponseService, // Assuming this will be used within a larger function
  // summarizeConversationService,
  // analyzeSentimentForRelationshipUpdateService
} from './services/geminiService';

import Header from './components/Header';
import OnboardingView from './components/OnboardingView';
import ChatView from './components/ChatView';
import GameOverView from './components/GameOverView';
import LoadingSpinner from './components/LoadingSpinner';
import ProfileView from './components/ProfileView';
import ShopView, { CreditPackage } from './components/ShopView';
import PaymentModal from './components/PaymentModal';

const App: React.FC = () => {
  const [appScreen, setAppScreenInternal] = useState<AppScreen>(AppScreen.ONBOARDING_SCENARIO); // Default to a loading/onboarding screen
  const [previousScreenBeforeMenu, setPreviousScreenBeforeMenu] = useState<AppScreen>(AppScreen.ONBOARDING_SCENARIO);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // For Shop Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{credits: number, name: string} | null>(null);

  const setAppScreen = (targetScreen: AppScreen) => {
    const currentScreen = appScreen;
    if (currentScreen !== targetScreen) {
      const targetIsMenuScreen = targetScreen === AppScreen.PROFILE || targetScreen === AppScreen.SHOP;
      if (targetIsMenuScreen &&
          currentScreen !== AppScreen.PROFILE &&
          currentScreen !== AppScreen.SHOP) {
        setPreviousScreenBeforeMenu(currentScreen);
      }
    }
    setAppScreenInternal(targetScreen);
  };

  // Main effect for handling anonymous authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, set the UID
        setCurrentUserId(user.uid);
      } else {
        // User is signed out, sign them in anonymously
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setErrorMessage("Failed to start a session. Please refresh the page.");
        });
      }
    });
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // Effect for fetching user data and session once we have a user ID
  useEffect(() => {
    if (!currentUserId) return;

    const hydrateState = async () => {
      setIsLoading(true);
      try {
        let userProfile = await getUserProfile(currentUserId);
        if (!userProfile) {
          await createUserProfile(currentUserId);
          userProfile = await getUserProfile(currentUserId);
        }
        setUserState(userProfile);

        const activeSession = await getActiveSession(currentUserId);
        if (activeSession) {
          setGameState(activeSession);
          setAppScreen(AppScreen.CHATTING);
        } else {
          setAppScreen(AppScreen.ONBOARDING_SCENARIO);
        }
      } catch (error) {
        console.error("Error hydrating state:", error);
        setErrorMessage("Could not load your profile or session.");
      } finally {
        setIsLoading(false);
      }
    };

    hydrateState();
  }, [currentUserId]);

const handleScenarioSelect = async (scenario: Scenario) => {
    if (!userState || !currentUserId) {
      setErrorMessage("Please wait for your session to load.");
      return;
    }
    if (scenario.isPremium && !userState.isPremium) {
      setErrorMessage("This scenario requires a premium account. Visit your profile to upgrade.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    // Directly generate the persona
    const persona = await generateAIPersonaService(scenario);
    if (persona) {
      const newChatHistory: ChatMessage[] = [];
      if (persona.firstAIMessage) {
        const firstMsg: ChatMessage = {
          id: `ai-init-${persona.name}-${Date.now()}`,
          sender: 'ai',
          text: persona.firstAIMessage,
          timestamp: Date.now(),
        };
        newChatHistory.push(firstMsg);
      }
      const newGameState: GameState = {
        currentScenario: scenario,
        aiPersona: persona,
        relationshipScore: INITIAL_RELATIONSHIP_SCORE,
        chatHistory: newChatHistory,
        conversationSummary: ""
      };
      setGameState(newGameState);
      await saveSession(currentUserId, newGameState);
      setAppScreen(AppScreen.CHATTING);
    } else {
      setErrorMessage("Failed to generate AI persona. Please try again.");
      setAppScreen(AppScreen.ONBOARDING_SCENARIO);
    }
    setIsLoading(false);
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!currentUserId || !gameState) {
      setErrorMessage("Session not initialized.");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    const newGameState = {
      ...gameState,
      chatHistory: [...gameState.chatHistory, userMessage],
    };
    setGameState(newGameState);
    await saveSession(currentUserId, newGameState);
  }, [currentUserId, gameState]);

  const handleResetScenario = async () => {
    if (!currentUserId) return;
    const newGameState: GameState = {
      currentScenario: null,
      aiPersona: null,
      relationshipScore: INITIAL_RELATIONSHIP_SCORE,
      chatHistory: [],
      conversationSummary: "",
    };
    setGameState(newGameState);
    await saveSession(currentUserId, newGameState);
    setAppScreen(AppScreen.ONBOARDING_SCENARIO);
    setErrorMessage(null);
  };

  const handleNavigateBackFromMenu = () => {
    if (gameState && gameState.currentScenario && gameState.aiPersona) {
      setAppScreen(AppScreen.CHATTING);
    } else {
      setAppScreen(previousScreenBeforeMenu || AppScreen.ONBOARDING_SCENARIO);
    }
  };

  const handleTogglePremium = async () => {
    if (!currentUserId || !userState) return;
    const newPremiumStatus = !userState.isPremium;
    setUserState({ ...userState, isPremium: newPremiumStatus });
    await updateUserProfile(currentUserId, { isPremium: newPremiumStatus });
  };

  // Shop related handlers
  const handleInitiatePurchase = (credits: number, name: string) => {
    setSelectedPackage({ credits, name });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPurchase = async (creditsToAward: number) => {
    if (!currentUserId || !userState) return;
    const newCredits = userState.credits + creditsToAward;
    setUserState({ ...userState, credits: newCredits });
    await updateUserProfile(currentUserId, { credits: newCredits });
    setIsPaymentModalOpen(false);
    setSelectedPackage(null);
  };

  const renderScreen = () => {
    if (isLoading || !userState) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
            <LoadingSpinner />
            <p className="mt-4 text-gray-700 dark:text-gray-300">Loading your Echoes experience...</p>
          </div>
        );
    }

    switch (appScreen) {
      case AppScreen.ONBOARDING_SCENARIO:
        return <OnboardingView userState={userState} onScenarioSelect={handleScenarioSelect} isLoading={isLoading} />;
      case AppScreen.CHATTING:
        if (!gameState || !gameState.aiPersona) {
          setAppScreen(AppScreen.ONBOARDING_SCENARIO);
          return <LoadingSpinner />;
        }
        return (
          <ChatView
            userState={userState}
            aiPersona={gameState.aiPersona}
            chatHistory={gameState.chatHistory}
            onSendMessage={handleSendMessage}
            isLoading={false} // This can be refined later
            initialSystemMessage={gameState.aiPersona.initialSystemMessage}
          />
        );
      case AppScreen.GAME_OVER:
        return <GameOverView aiPersona={gameState?.aiPersona || null} onReset={handleResetScenario} />;
      case AppScreen.PROFILE:
        return <ProfileView userState={userState} onTogglePremium={handleTogglePremium} onBack={handleNavigateBackFromMenu} />;
      case AppScreen.SHOP:
        return <ShopView userState={userState} onInitiatePurchase={handleInitiatePurchase} onBack={handleNavigateBackFromMenu} />;
      default:
        setAppScreen(AppScreen.ONBOARDING_SCENARIO); // Default to onboarding
        return <div className="text-center p-5 dark:text-white">Unknown screen state. Redirecting...</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header
        userState={userState}
        gameState={gameState}
        onResetScenario={handleResetScenario}
        currentScreen={appScreen}
        navigateTo={setAppScreen}
      />
      <main className="flex-grow container mx-auto w-full max-w-4xl px-2 sm:px-4">
        {errorMessage && (
          <div className="p-4 my-4 text-sm text-red-700 bg-red-100 dark:bg-red-200 dark:text-red-800 rounded-lg shadow" role="alert">
            <span className="font-medium">Error:</span> {errorMessage} <button onClick={() => setErrorMessage(null)} className="float-right font-bold">X</button>
          </div>
        )}
        {renderScreen()}
      </main>
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirmPurchase={handleConfirmPurchase}
        item={selectedPackage}
      />
      <footer className="text-center p-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-auto">
        Echoes AI Friend © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
