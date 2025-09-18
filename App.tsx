import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from './firebaseConfig';
import {
  AppScreen,
  UserState,
  GameState,
  Journey,
  ChatMessage,
} from './types';
import { INITIAL_RELATIONSHIP_SCORE, JOURNEY_DEFINITIONS } from './constants';
import {
  getUserProfile,
  createUserProfile,
  getActiveSession,
  saveSession,
  updateUserProfile,
} from './services/firestoreService';
import {
  generateAIPersonaService,
  analyzeSentimentForRelationshipUpdateService,
  generateAIChatResponseService,
} from './services/geminiService';
import { MoodLog } from './types';

import Header from './components/Header';
import JourneySelectionView from './components/JourneySelectionView';
import ChatView from './components/ChatView';
import GameOverView from './components/GameOverView';
import LoadingSpinner from './components/LoadingSpinner';
import ProfileView from './components/ProfileView';
import ShopView from './components/ShopView';
import PaymentModal from './components/PaymentModal';
import ApiKeyView from './components/ApiKeyView'; // Import the new component

const App: React.FC = () => {
  const [appScreen, setAppScreenInternal] = useState<AppScreen>(AppScreen.ONBOARDING_SCENARIO);
  const [previousScreenBeforeMenu, setPreviousScreenBeforeMenu] = useState<AppScreen>(AppScreen.ONBOARDING_SCENARIO);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null); // State for the API key

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
        setCurrentUserId(user.uid);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setErrorMessage("Failed to start a session. Please refresh the page.");
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching user data, checking API key, and loading session
  useEffect(() => {
    if (!currentUserId) return;

    const hydrateState = async () => {
      setIsLoading(true);
      try {
        // 1. Check for API Key
        const savedKey = localStorage.getItem('geminiApiKey');
        if (savedKey) {
          setGeminiApiKey(savedKey);

          // 2. Load User Profile
          let userProfile = await getUserProfile(currentUserId);
          if (!userProfile) {
            await createUserProfile(currentUserId);
            userProfile = await getUserProfile(currentUserId);
          }
          // Ensure moodHistory is initialized
          if (userProfile && !userProfile.moodHistory) {
            userProfile.moodHistory = [];
          }
          setUserState(userProfile);

          // 3. Load Active Session
          const activeSession = await getActiveSession(currentUserId);
          if (activeSession) {
            setGameState(activeSession);
            setAppScreen(AppScreen.CHATTING);
          } else {
            setAppScreen(AppScreen.ONBOARDING_SCENARIO);
          }
        } else {
          // No API Key, force user to enter one
          setAppScreen(AppScreen.API_KEY_ENTRY);
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

  const handleSaveApiKey = (key: string) => {
    if (!key) return;
    localStorage.setItem('geminiApiKey', key);
    setGeminiApiKey(key);
    // After saving the key, we need to load the user profile
    // The main useEffect will re-run if we reload, but let's just proceed
    setIsLoading(true);
    const initializeUser = async () => {
        if (!currentUserId) return;
        let userProfile = await getUserProfile(currentUserId);
        if (!userProfile) {
          await createUserProfile(currentUserId);
          userProfile = await getUserProfile(currentUserId);
        }
        setUserState(userProfile);
        setAppScreen(AppScreen.ONBOARDING_SCENARIO);
        setIsLoading(false);
    };
    initializeUser();
  };

  const handleJourneySelect = async (journey: Journey) => {
    if (!userState || !currentUserId || !geminiApiKey) {
      setErrorMessage("API Key not set or session not loaded.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const journeyDefinition = JOURNEY_DEFINITIONS.find(j => j.id === journey.id);
    if (!journeyDefinition) {
      setErrorMessage("Selected journey not found.");
      return;
    }

    // Generate a persona based on the journey's context (optional, can be simplified)
    const persona = await generateAIPersonaService({ name: journey.name, description: journey.description, isPremium: false, id: journey.id }, geminiApiKey);

    if (persona) {
      const firstStep = journeyDefinition.steps[0];
      const firstMessage: ChatMessage = {
        id: `system-journey-start-${Date.now()}`,
        sender: 'system',
        text: firstStep.content,
        timestamp: Date.now(),
      };

      const newGameState: GameState = {
        currentScenario: null, // Or you can adapt this to hold journey info
        aiPersona: persona,
        relationshipScore: INITIAL_RELATIONSHIP_SCORE,
        chatHistory: [firstMessage],
        conversationSummary: "",
        activeJourneyId: journey.id,
        currentJourneyStepId: 0
      };

      const finalState = advanceJourney(newGameState);
      setGameState(finalState);
      await saveSession(currentUserId, finalState);
      setAppScreen(AppScreen.CHATTING);
    } else {
      setErrorMessage("Failed to generate AI persona for the journey. Check your API key.");
      setAppScreen(AppScreen.ONBOARDING_SCENARIO);
    }
    setIsLoading(false);
  };

  const advanceJourney = (currentGameState: GameState): GameState => {
    if (!currentGameState.activeJourneyId || currentGameState.currentJourneyStepId === undefined) {
      return currentGameState;
    }

    const journey = JOURNEY_DEFINITIONS.find(j => j.id === currentGameState.activeJourneyId);
    if (!journey) {
      setErrorMessage("Error: Active journey not found during advancement.");
      return {
        ...currentGameState,
        activeJourneyId: undefined,
        currentJourneyStepId: undefined,
      };
    }

    let updatedGameState = { ...currentGameState };
    let nextStepIndex = updatedGameState.currentJourneyStepId + 1;

    while (journey.steps[nextStepIndex] && journey.steps[nextStepIndex].type === 'PROMPT') {
      const nextStep = journey.steps[nextStepIndex];
      const systemMessage: ChatMessage = {
        id: `system-journey-${nextStep.stepId}-${Date.now()}`,
        sender: 'system',
        text: nextStep.content,
        timestamp: Date.now(),
      };
      updatedGameState.chatHistory.push(systemMessage);
      updatedGameState.currentJourneyStepId = nextStepIndex;
      nextStepIndex++;
    }

    // Check if the journey is over AFTER the loop
    if (!journey.steps[nextStepIndex]) {
      const concludingMessage: ChatMessage = {
        id: `system-journey-complete-${Date.now()}`,
        sender: 'system',
        text: "You've completed this journey. I hope it was helpful. You can now chat freely or start a new journey.",
        timestamp: Date.now(),
      };
      updatedGameState.chatHistory.push(concludingMessage);
      updatedGameState.activeJourneyId = undefined;
      updatedGameState.currentJourneyStepId = undefined;
    } else {
        // If the journey is not over, the next step must be a USER_INPUT, so we update the step counter
        updatedGameState.currentJourneyStepId = nextStepIndex;
    }

    return updatedGameState;
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!currentUserId || !gameState || !geminiApiKey || !gameState.aiPersona) {
      setErrorMessage("Session not initialized or API key missing.");
      return;
    }

    // 1. Create the user message and update state immediately for responsiveness
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: Date.now(),
      moodAnalysis: undefined, // Placeholder
    };

    const tempGameState = {
      ...gameState,
      chatHistory: [...gameState.chatHistory, userMessage],
    };
    setGameState(tempGameState);

    // Journey Mode vs. Free-Chat Mode
    if (gameState.activeJourneyId && gameState.currentJourneyStepId !== undefined) {
      const advancedState = advanceJourney(tempGameState);
      setGameState(advancedState);
      await saveSession(currentUserId, advancedState);
    } else {
      // Free-Chat Mode Logic (existing logic)
      const moodAnalysis = await analyzeSentimentForRelationshipUpdateService(messageText, geminiApiKey);
      if (moodAnalysis) {
        userMessage.moodAnalysis = moodAnalysis;
      }

      const aiResponseText = await generateAIChatResponseService(
          messageText,
          gameState.conversationSummary,
          gameState.aiPersona,
          tempGameState.chatHistory,
          geminiApiKey
      );

      const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiResponseText || "I'm not sure how to respond to that. Could you try rephrasing?",
          timestamp: Date.now(),
      };

      const finalGameState = {
        ...tempGameState,
        chatHistory: [...tempGameState.chatHistory, aiMessage],
      };

      setGameState(finalGameState);
      await saveSession(currentUserId, finalGameState);
    }

  }, [currentUserId, gameState, geminiApiKey]);

  const handleResetScenario = async () => {
    if (!currentUserId) return;
    const newGameState: GameState = {
      currentScenario: null,
      aiPersona: null,
      relationshipScore: INITIAL_RELATIONSHIP_SCORE,
      chatHistory: [],
      conversationSummary: "",
      activeJourneyId: undefined,
      currentJourneyStepId: undefined,
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
    const updatedUserState = { ...userState, isPremium: newPremiumStatus };
    setUserState(updatedUserState);
    await updateUserProfile(currentUserId, updatedUserState);
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
    await updateUserProfile(currentUserId, { ...userState, credits: newCredits });
    setIsPaymentModalOpen(false);
    setSelectedPackage(null);
  };

  const handleLogMood = async (mood: number) => {
    if (!currentUserId || !userState) return;

    const newLog: MoodLog = {
      date: new Date().toISOString().split('T')[0],
      mood: mood,
    };

    const updatedMoodHistory = [...(userState.moodHistory || []), newLog];
    const updatedUserState = { ...userState, moodHistory: updatedMoodHistory };

    setUserState(updatedUserState);
    await updateUserProfile(currentUserId, updatedUserState);
  };

  const renderScreen = () => {
    if (isLoading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
            <LoadingSpinner />
            <p className="mt-4 text-gray-700 dark:text-gray-300">Loading your Echoes experience...</p>
          </div>
        );
    }

    switch (appScreen) {
      case AppScreen.API_KEY_ENTRY:
        return <ApiKeyView onSave={handleSaveApiKey} isLoading={isLoading} />;
      case AppScreen.ONBOARDING_SCENARIO:
        if (!userState) return <LoadingSpinner />; // Should be handled by main isLoading, but as a fallback
        return <JourneySelectionView userState={userState} onJourneySelect={handleJourneySelect} isLoading={isLoading} />;
      case AppScreen.CHATTING:
        if (!gameState || !gameState.aiPersona || !userState) {
          setAppScreen(AppScreen.ONBOARDING_SCENARIO);
          return <LoadingSpinner />;
        }
        return (
          <ChatView
            userState={userState}
            aiPersona={gameState.aiPersona}
            chatHistory={gameState.chatHistory}
            onSendMessage={handleSendMessage}
            onLogMood={handleLogMood}
            isLoading={false}
            initialSystemMessage={gameState.aiPersona.initialSystemMessage}
          />
        );
      case AppScreen.GAME_OVER:
        return <GameOverView aiPersona={gameState?.aiPersona || null} onReset={handleResetScenario} />;
      case AppScreen.PROFILE:
        if (!userState) return null;
        return <ProfileView userState={userState} onTogglePremium={handleTogglePremium} onBack={handleNavigateBackFromMenu} />;
      case AppScreen.SHOP:
        if (!userState) return null;
        return <ShopView userState={userState} onInitiatePurchase={handleInitiatePurchase} onBack={handleNavigateBackFromMenu} />;
      default:
        setAppScreen(AppScreen.ONBOARDING_SCENARIO);
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
