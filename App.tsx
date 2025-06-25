
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import firebaseConfig from './firebaseConfig';
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
  // Credit constants like FREE_USER_INITIAL_CREDITS are now mainly used in firestoreService for new user setup
} from './constants';
// import { saveUserState, loadUserState, saveGameState, loadGameState, clearGameState, clearUserState } from './utils/localStorageHelper'; // Will be removed
import {
  saveUserStateToFirestore,
  loadUserStateFromFirestore,
  deleteUserStateFromFirestore, // If needed for complete account deletion scenarios
  saveGameStateToFirestore,
  loadGameStateFromFirestore,
  deleteGameStateFromFirestore,
  upsertUserProfileDocument
} from './services/firestoreService';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
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
        console.log("Firebase user signed in:", firebaseUser.uid, firebaseUser.email);
        try {
          // Upsert user profile (creates if new, updates lastLogin and daily credits if existing)
          const userProfile = await upsertUserProfileDocument(firebaseUser);
          setUserState(userProfile);

          // Load game state from Firestore
          const loadedGameState = await loadGameStateFromFirestore(firebaseUser.uid);
          if (loadedGameState && loadedGameState.currentScenario && loadedGameState.aiPersona) {
            // Ensure AI's first message is correctly part of chat history (if applicable)
            if (loadedGameState.aiPersona.firstAIMessage &&
                !loadedGameState.chatHistory.some(msg => msg.sender === 'ai' && msg.text === loadedGameState.aiPersona.firstAIMessage && msg.timestamp === 0)) {
            const firstMsg: ChatMessage = {
              id: `ai-init-${loadedGameState.aiPersona.name}-${Date.now()}`,
              sender: 'ai',
              text: loadedGameState.aiPersona.firstAIMessage,
              timestamp: 0,
            };
            loadedGameState.chatHistory = [firstMsg, ...loadedGameState.chatHistory.filter(m => m.timestamp !== 0)];
            loadedGameState.chatHistory.sort((a,b) => a.timestamp - b.timestamp);
          }
          setGameState(loadedGameState);
          setAppScreen(AppScreen.CHATTING);
        } else {
          setGameState(null); // Explicitly nullify if no game state
          // Optionally, ensure any lingering game state in Firestore for this user is cleared if no valid one is loaded
          // This might be aggressive, depends on desired behavior for corrupted/incomplete game states.
          // await deleteGameStateFromFirestore(firebaseUser.uid);
          setAppScreen(AppScreen.ONBOARDING_SCENARIO);
        }
        setPreviousScreenBeforeMenu(AppScreen.ONBOARDING_SCENARIO); // Default back target after login

      } catch (error) {
        console.error("Error during Firebase user processing:", error);
        setErrorMessage("Error loading your profile or game. Please try logging out and in again.");
        // Consider signing out the user if profile/game loading is critical and fails
        // await auth.signOut(); // This would trigger the 'else' block below
      }
    } else {
      // User is signed out
      console.log("Firebase user signed out.");
      setUserState({
        userId: null,
        isLoggedIn: false,
        ...initialUserStateValues,
        lastLoginDate: null,
      });
      setGameState(null);
      setAppScreen(AppScreen.LOGIN);
      // No need to clear local storage specifically if Firestore is the source of truth.
    }
    setIsLoading(false);
    setErrorMessage(null);
  });

  return () => unsubscribe(); // Cleanup subscription on unmount
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Keep dependencies minimal; auth instance is stable.

// useEffect for saving UserState to Firestore when it changes
useEffect(() => {
  // Check for valid, logged-in user state to prevent saving initial/logged-out states.
  if (userState.isLoggedIn && userState.userId && userState.email !== undefined) { // Added email check as a proxy for "real" user data
    const handler = setTimeout(() => { // Debounce save
      saveUserStateToFirestore(userState.userId, userState).catch(error => {
        console.error("Failed to save UserState to Firestore:", error);
        setErrorMessage("Error saving your profile data. Some changes might not persist.");
      });
    }, 1000); // Debounce by 1 second
    return () => clearTimeout(handler);
  }
}, [userState]);

// useEffect for saving GameState to Firestore when it changes
useEffect(() => {
  // Check for valid game state and logged-in user.
  if (gameState && userState.isLoggedIn && userState.userId && userState.email !== undefined) {
    const handler = setTimeout(() => { // Debounce save
      saveGameStateToFirestore(userState.userId, gameState).catch(error => {
        console.error("Failed to save GameState to Firestore:", error);
        setErrorMessage("Error saving your game progress. Some changes might not persist.");
      });
    }, 1000); // Debounce by 1 second
    return () => clearTimeout(handler);
  }
}, [gameState, userState.isLoggedIn, userState.userId, userState.email]);

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
    if (!userState.isLoggedIn || !userState.userId || !gameState || !gameState.aiPersona || !gameState.currentScenario) {
        setErrorMessage("User not logged in or game state is invalid.");
        if (!userState.isLoggedIn || !userState.userId) {
            auth.signOut().catch(err => console.error("Error signing out on unauthorized send:", err));
        }
        return;
    }
     if (userState.credits < CREDITS_PER_TURN) {
      setErrorMessage("Not enough credits to send a message.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: Date.now(),
    };
    
    const newChatHistoryAfterUser = [...gameState.chatHistory, userMessage];
    setGameState(prev => prev ? ({ ...prev, chatHistory: newChatHistoryAfterUser }) : null);
    setUserState(prev => ({ ...prev, credits: prev.credits - CREDITS_PER_TURN }));

    const personaSummary = gameState.aiPersona.personalityTraits.slice(0,2).join(', ');
    const scoreChange = await analyzeSentimentForRelationshipUpdateService(
      messageText,
      personaSummary, // from closure
      currentRelationshipScoreForCall, // from closure
      getRelationshipLevel(currentRelationshipScoreForCall) // from closure
    );
    let newRelationshipScore = Math.max(MIN_RELATIONSHIP_SCORE, Math.min(MAX_RELATIONSHIP_SCORE, currentRelationshipScoreForCall + scoreChange));

    if (newRelationshipScore <= MIN_RELATIONSHIP_SCORE && currentRelationshipScoreForCall > MIN_RELATIONSHIP_SCORE) {
      setGameState(prev => prev ? ({ ...prev, relationshipScore: 0 }) : null); // Saved by useEffect
      setAppScreen(AppScreen.GAME_OVER);
      setIsLoading(false);
      return;
    }

    let updatedAIPersonaForCall = { ...currentAIPersonaForCall }; // Make a mutable copy for this scope
    if (updatedAIPersonaForCall.isBusy && updatedAIPersonaForCall.busyUntil && Date.now() < updatedAIPersonaForCall.busyUntil) {
       const busyMessage: ChatMessage = {
        id: `system-busy-${Date.now()}`,
        sender: 'system',
        text: `${updatedAIPersonaForCall.name} seems to be busy with ${updatedAIPersonaForCall.busyReason || 'something'}. They'll be back shortly.`,
        timestamp: Date.now(),
      };
      setGameState(prev => prev ? ({
          ...gameStateBeforeAIStep, // Revert to state before AI call, but add busy message
          chatHistory: [...newChatHistoryAfterUser, busyMessage],
          relationshipScore: newRelationshipScore, // Still apply relationship score change
          aiPersona: updatedAIPersonaForCall // Keep the current persona (still busy)
      }) : null);
      setIsLoading(false);
      return;
    } else if (updatedAIPersonaForCall.isBusy) {
        updatedAIPersonaForCall = {...updatedAIPersonaForCall, isBusy: false, busyReason: undefined, busyUntil: undefined };
    }

    const aiResponseText = await generateAIChatResponseService(
      messageText,
      currentConversationSummaryForCall, // from closure
      updatedAIPersonaForCall, // Potentially updated (no longer busy)
      newRelationshipScore,
      getRelationshipLevel(newRelationshipScore),
      newChatHistoryAfterUser // from closure
    );

    if (aiResponseText) {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: Date.now(),
      };
      const finalChatHistory = [...newChatHistoryAfterUser, aiMessage];
      
      let newConversationSummary = currentConversationSummaryForCall;
      if (finalChatHistory.length % SUMMARIZE_CONVERSATION_TURN_INTERVAL === 0 && finalChatHistory.length > 0) {
        const summary = await summarizeConversationService(
          updatedAIPersonaForCall.name,
          finalChatHistory.slice(-SUMMARIZE_CONVERSATION_TURN_INTERVAL)
        );
        if (summary) {
          newConversationSummary += `\n\n[Summary after turn ${finalChatHistory.length}]: ${summary}`;
        }
      }

      let updatedAIPersona = currentAIPersona;
      if (Math.random() < AI_BUSY_CHANCE) {
          updatedAIPersona = {
              ...currentAIPersona,
              isBusy: true,
              busyReason: AI_BUSY_REASONS[Math.floor(Math.random() * AI_BUSY_REASONS.length)],
              busyUntil: Date.now() + AI_MIN_BUSY_DURATION_MS + Math.random() * (AI_MAX_BUSY_DURATION_MS - AI_MIN_BUSY_DURATION_MS)
          };
      }

      setGameState(prev => prev ? ({ 
        ...prev, 
        aiPersona: updatedAIPersona,
        chatHistory: finalChatHistory, 
        relationshipScore: newRelationshipScore,
        conversationSummary: newConversationSummary
      }) : null);

    } else {
      setErrorMessage("AI failed to respond. Please try sending your message again.");
       setGameState(prev => prev ? ({ ...prev, relationshipScore: newRelationshipScore }) : null);
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, userState.credits, userState.isLoggedIn, userState.userId]); 


  const handleResetScenario = () => {
    if (userState.userId) {
        clearGameState(userState.userId);
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
