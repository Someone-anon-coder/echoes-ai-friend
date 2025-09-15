
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously } from "firebase/auth";
import { auth } from './firebaseConfig';
import { 
  AppScreen, 
  UserState, 
  GameState, 
  Scenario, 
  AIGender, 
  AIPersona, 
  ChatMessage,
  RelationshipLevel
} from './types';
import {
  INITIAL_RELATIONSHIP_SCORE, CREDITS_PER_TURN,
  SUMMARIZE_CONVERSATION_TURN_INTERVAL, MAX_RELATIONSHIP_SCORE, MIN_RELATIONSHIP_SCORE,
  getRelationshipLevel, AI_BUSY_CHANCE, AI_MIN_BUSY_DURATION_MS, AI_MAX_BUSY_DURATION_MS, AI_BUSY_REASONS
  // Credit constants like FREE_USER_INITIAL_CREDITS are now mainly used in firebaseService for new user setup
} from './constants';
import {
  getUserData,
  createUserData,
  getSessionData,
  saveSessionData,
  addMessageToSession,
} from './services/firebaseService';
import { 
  generateAIPersonaService, 
  generateAIChatResponseService, 
  summarizeConversationService,
  analyzeSentimentForRelationshipUpdateService
} from './services/geminiService';

import Header from './components/Header';
import OnboardingView from './components/OnboardingView';
import ChatView from './components/ChatView';
import GameOverView from './components/GameOverView';
import LoadingSpinner from './components/LoadingSpinner';
import ProfileView from './components/ProfileView';
import ShopView, { CreditPackage } from './components/ShopView'; // Import CreditPackage
import LoginView from './components/LoginView'; // New LoginView
import PaymentModal from './components/PaymentModal'; // New PaymentModal


// API Key check for process.env.API_KEY is no longer needed here as it's managed by Cloud Functions
// console.warn("Gemini API Key check removed from client-side App.tsx.");

// We'll initialize Firestore when we start using it.

const initialUserStateValues: Omit<UserState, 'userId' | 'isLoggedIn' | 'lastLoginDate'> = {
    credits: FREE_USER_INITIAL_CREDITS,
    isPremium: false,
};


const App: React.FC = () => {
  const [appScreen, setAppScreenInternal] = useState<AppScreen>(AppScreen.LOGIN); // Start on Login screen
  const [previousScreenBeforeMenu, setPreviousScreenBeforeMenu] = useState<AppScreen>(AppScreen.ONBOARDING_SCENARIO);
  const [userState, setUserState] = useState<UserState>({
    userId: null,
    isLoggedIn: false,
    ...initialUserStateValues,
    lastLoginDate: null,
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // For Shop Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{credits: number, name: string} | null>(null);


  const setAppScreen = (targetScreen: AppScreen) => {
    const currentScreen = appScreen; 
    if (currentScreen !== targetScreen) {
      const targetIsMenuScreen = targetScreen === AppScreen.PROFILE || targetScreen === AppScreen.SHOP;
      // Only set previousScreen if navigating from a non-menu, non-login screen to a menu screen
      if (targetIsMenuScreen && 
          currentScreen !== AppScreen.PROFILE && 
          currentScreen !== AppScreen.SHOP &&
          currentScreen !== AppScreen.LOGIN) {
        setPreviousScreenBeforeMenu(currentScreen);
      }
    }
    setAppScreenInternal(targetScreen); 
  };

  // Effect for Firebase Auth state changes and initial loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      if (firebaseUser) {
        console.log("Firebase user signed in:", firebaseUser.uid);
        try {
          let userData = await getUserData(firebaseUser.uid);
          if (!userData) {
            console.log("No user data found, creating new user.");
            const initialData = {
              credits: 100,
              isPremium: false,
              createdAt: new Date().toISOString(),
            };
            await createUserData(firebaseUser.uid, initialData);
            userData = await getUserData(firebaseUser.uid);
          }
          setUserState({
            userId: firebaseUser.uid,
            isLoggedIn: true,
            ...userData,
          });

          // Placeholder for loading session data
          const sessionData = await getSessionData(firebaseUser.uid, 'activeSession');
          if (sessionData) {
            setGameState(sessionData);
            setAppScreen(AppScreen.CHATTING);
          } else {
            setGameState(null);
            setAppScreen(AppScreen.ONBOARDING_SCENARIO);
          }
        } catch (error) {
          console.error("Error during Firebase user processing:", error);
          setErrorMessage("Error loading your profile or game. Please try again.");
        }
      } else {
        // User is signed out, sign them in anonymously
        console.log("No user signed in. Attempting anonymous sign-in.");
        signInAnonymously(auth).catch(error => {
          console.error("Anonymous sign-in failed:", error);
          setErrorMessage("Failed to start an anonymous session. Please refresh the page.");
        });
      }
      setIsLoading(false);
    });

  return () => unsubscribe(); // Cleanup subscription on unmount
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Keep dependencies minimal; auth instance is stable.

// useEffect for saving session data when it changes
useEffect(() => {
  if (userState.isLoggedIn && userState.userId && gameState) {
    const handler = setTimeout(() => {
      saveSessionData(userState.userId, 'activeSession', gameState).catch(error => {
        console.error("Failed to save session data:", error);
        setErrorMessage("Error saving your game progress.");
      });
    }, 1000); // Debounce by 1 second
    return () => clearTimeout(handler);
  }
}, [gameState, userState.isLoggedIn, userState.userId]);

const handleLogout = async () => {
  setIsLoading(true);
  try {
    await auth.signOut();
    // onAuthStateChanged will handle resetting app state (userState, gameState to null, screen to LOGIN)
    console.log("User signed out successfully from Firebase.");
  } catch (error) {
    console.error("Error signing out from Firebase:", error);
    setErrorMessage("Failed to logout. Please try again.");
  }
  setIsLoading(false);
};

const handleScenarioSelect = (scenario: Scenario) => {
    if (!userState.isLoggedIn) {
      setErrorMessage("Please log in to start a scenario.");
      setAppScreen(AppScreen.LOGIN);
      return;
    }
    if (scenario.isPremium && !userState.isPremium) {
      setErrorMessage("This scenario requires a premium account. Visit your profile to upgrade.");
      return;
    }
    setGameState({ 
      currentScenario: scenario, 
      aiPersona: null, 
      relationshipScore: INITIAL_RELATIONSHIP_SCORE, 
      chatHistory: [],
      conversationSummary: ""
    });
    setAppScreen(AppScreen.ONBOARDING_GENDER);
    setErrorMessage(null);
  };

  const handleGenderSelect = async (gender: AIGender) => {
    if (!gameState || !gameState.currentScenario || !userState.isLoggedIn) return;
    setIsLoading(true);
    setErrorMessage(null);
    const persona = await generateAIPersonaService(gameState.currentScenario, gender);
    if (persona) {
      const newChatHistory: ChatMessage[] = [];
      if (persona.firstAIMessage) {
        const firstMsg: ChatMessage = {
          id: `ai-init-${persona.name}-${Date.now()}`,
          sender: 'ai',
          text: persona.firstAIMessage,
          timestamp: 0, 
        };
        newChatHistory.push(firstMsg);
      }
      setGameState(prev => ({ 
        ...prev!, 
        aiPersona: persona,
        chatHistory: newChatHistory 
      }));
      setAppScreen(AppScreen.CHATTING);
    } else {
      setErrorMessage("Failed to generate AI persona. Please try again or select a different scenario/gender.");
      setAppScreen(AppScreen.ONBOARDING_SCENARIO); 
    }
    setIsLoading(false);
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!userState.isLoggedIn || !userState.userId) {
      setErrorMessage("User not logged in.");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    await addMessageToSession(userState.userId, 'activeSession', userMessage);

    // In a real app, you'd probably get the AI response here and then add it to the session.
    // For now, we just add the user's message.
    setGameState(prev => prev ? ({ ...prev, chatHistory: [...prev.chatHistory, userMessage] }) : null);
  }, [userState.isLoggedIn, userState.userId]);

  const handleResetScenario = () => {
    if (userState.userId) {
      // In a real app, you would clear the session data in Firestore
      console.log("Resetting scenario for user:", userState.userId);
    }
    setGameState(null);
    setAppScreen(AppScreen.ONBOARDING_SCENARIO);
    setErrorMessage(null);
  };

  const handleNavigateBackFromMenu = () => {
    if (userState.isLoggedIn) {
        if (gameState && gameState.currentScenario && gameState.aiPersona) {
            setAppScreen(AppScreen.CHATTING);
        } else {
            setAppScreen(previousScreenBeforeMenu || AppScreen.ONBOARDING_SCENARIO);
        }
    } else {
        setAppScreen(AppScreen.LOGIN); // Should not happen if menu accessed, but as a fallback
    }
  };

  const handleTogglePremium = () => {
    setUserState(prevUserState => {
      const newPremiumStatus = !prevUserState.isPremium;
      const updatedUserState = { ...prevUserState, isPremium: newPremiumStatus };
      // UserState will be saved by its useEffect hook.
      // If immediate save is desired for this specific action:
      // if (prevUserState.userId) {
      //   saveUserStateToFirestore(prevUserState.userId, updatedUserState)
      //     .catch(err => console.error("Failed to save premium status to Firestore", err));
      // }
      return updatedUserState;
    });
  };
  
  // Shop related handlers
  const handleInitiatePurchase = (credits: number, name: string) => {
    setSelectedPackage({ credits, name });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPurchase = (creditsToAward: number) => {
    setUserState(prev => ({...prev, credits: prev.credits + creditsToAward}));
    setIsPaymentModalOpen(false);
    setSelectedPackage(null);
    // Optionally, show a success message
  };


  const renderScreen = () => {
    if (!userState.isLoggedIn && appScreen !== AppScreen.LOGIN) {
      // If somehow not logged in and not on login screen, force redirect to Login
      // This is a safeguard. The primary logic is in useEffect for initial load.
      setAppScreenInternal(AppScreen.LOGIN);
      return <LoginView onLogin={handleSuccessfulLogin} setErrorMessage={setErrorMessage} />;
    }
    
    if (isLoading && appScreen !== AppScreen.LOGIN && ( // Don't show global loader on login screen itself
        (!gameState?.aiPersona && (appScreen === AppScreen.ONBOARDING_GENDER || appScreen === AppScreen.CHATTING)) ||
        (appScreen === AppScreen.ONBOARDING_SCENARIO && !userState.isLoggedIn) // Initial loading phase
    )) { 
        return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
            <LoadingSpinner />
            <p className="mt-4 text-gray-700 dark:text-gray-300">Loading your Echoes experience...</p>
          </div>
        );
    }

    switch (appScreen) {
      case AppScreen.LOGIN:
        return <LoginView setErrorMessage={setErrorMessage} />; // onLogin prop removed
      case AppScreen.ONBOARDING_SCENARIO:
        return <OnboardingView currentStep="scenario" userState={userState} onScenarioSelect={handleScenarioSelect} onGenderSelect={handleGenderSelect} isLoading={isLoading && appScreen === AppScreen.ONBOARDING_SCENARIO} />;
      case AppScreen.ONBOARDING_GENDER:
        return <OnboardingView currentStep="gender" userState={userState} onScenarioSelect={handleScenarioSelect} onGenderSelect={handleGenderSelect} isLoading={isLoading && appScreen === AppScreen.ONBOARDING_GENDER} />;
      case AppScreen.CHATTING:
        if (!gameState || !gameState.aiPersona) { 
          if (isLoading) {
             return (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
                <LoadingSpinner />
                <p className="mt-4 text-gray-700 dark:text-gray-300">Preparing chat...</p>
              </div>
            );
          }
          setAppScreen(AppScreen.ONBOARDING_SCENARIO); 
          return <OnboardingView currentStep="scenario" userState={userState} onScenarioSelect={handleScenarioSelect} onGenderSelect={handleGenderSelect} isLoading={false} />;
        }
        return (
          <ChatView 
            userState={userState}
            aiPersona={gameState.aiPersona} 
            chatHistory={gameState.chatHistory}
            onSendMessage={handleSendMessage}
            isLoading={isLoading && gameState.chatHistory.length > 0 && gameState.chatHistory[gameState.chatHistory.length -1].sender === 'user'} 
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
        setAppScreen(AppScreen.LOGIN); // Default to login if unknown state
        return <div className="text-center p-5 dark:text-white">Unknown screen state. Redirecting to login...</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header 
        userState={userState} 
        gameState={gameState} 
        onResetScenario={handleResetScenario} 
        onLogout={handleLogout}
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
