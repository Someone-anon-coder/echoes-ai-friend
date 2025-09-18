import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from './firebaseConfig';
import {
  AppScreen,
  UserState,
  GameState,
  Journey,
  ChatMessage,
} from './types';
import { JOURNEY_DEFINITIONS } from './constants';
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
import LoadingSpinner from './components/LoadingSpinner';
import LoginView from './components/LoginView';

const App: React.FC = () => {
  const [appScreen, setAppScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/generative-language.retriever');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        setAccessToken(credential.accessToken || null);
      }
      setAppScreen(AppScreen.ONBOARDING_SCENARIO);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setErrorMessage("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth State Changed. User:", user ? user.uid : 'No User');
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setAppScreen(AppScreen.LOGIN);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const hydrateState = async () => {
      console.log("User ID detected. Fetching data for:", currentUserId);
      setIsLoading(true);
      try {
        let userProfile = await getUserProfile(currentUserId);
        console.log("User profile fetched:", userProfile);
        if (!userProfile) {
          await createUserProfile(currentUserId);
          userProfile = await getUserProfile(currentUserId);
        }
        if (userProfile && !userProfile.moodHistory) {
          userProfile.moodHistory = [];
        }
        setUserState(userProfile);

        const activeSession = await getActiveSession(currentUserId);
        console.log("Active session fetched:", activeSession);
        let newScreenValue;
        if (userProfile && activeSession) {
          setGameState(activeSession);
          newScreenValue = AppScreen.CHATTING;
        } else if (userProfile) {
          newScreenValue = AppScreen.ONBOARDING_SCENARIO;
        } else {
          // Fallback to ensure we always have a valid screen
          newScreenValue = AppScreen.ONBOARDING_SCENARIO;
        }
        console.log("Navigating to screen:", newScreenValue);
        setAppScreen(newScreenValue);
      } catch (error) {
        console.error("Error hydrating state:", error);
        setErrorMessage("Could not load your profile or session.");
      } finally {
        setIsLoading(false);
      }
    };

    hydrateState();
  }, [currentUserId]);

  const handleJourneySelect = async (journey: Journey) => {
    if (!userState || !currentUserId || !accessToken) {
      setErrorMessage("Session not loaded or access token is missing.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const journeyDefinition = JOURNEY_DEFINITIONS.find(j => j.id === journey.id);
    if (!journeyDefinition) {
      setErrorMessage("Selected journey not found.");
      setIsLoading(false);
      return;
    }

    const persona = await generateAIPersonaService({ name: journey.name, description: journey.description, isPremium: false, id: journey.id }, accessToken);

    if (persona) {
      const firstStep = journeyDefinition.steps[0];
      const firstMessage: ChatMessage = {
        id: `system-journey-start-${Date.now()}`,
        sender: 'system',
        text: firstStep.content,
        timestamp: Date.now(),
      };

      const newGameState: GameState = {
        aiPersona: persona,
        chatHistory: [firstMessage],
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
    let nextStepIndex = updatedGameState.currentJourneyStepId! + 1;

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
        updatedGameState.currentJourneyStepId = nextStepIndex;
    }

    return updatedGameState;
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!currentUserId || !gameState || !gameState.aiPersona || !accessToken) {
      setErrorMessage("Session not initialized or access token is missing.");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    const tempGameState = {
      ...gameState,
      chatHistory: [...gameState.chatHistory, userMessage],
    };
    setGameState(tempGameState);

    if (gameState.activeJourneyId && gameState.currentJourneyStepId !== undefined) {
      const advancedState = advanceJourney(tempGameState);
      setGameState(advancedState);
      await saveSession(currentUserId, advancedState);
    } else {
      const moodAnalysis = await analyzeSentimentForRelationshipUpdateService(messageText, accessToken);
      if (moodAnalysis) {
        userMessage.moodAnalysis = moodAnalysis;
      }

      const aiResponseText = await generateAIChatResponseService(
          messageText,
          "", // No conversation summary
          gameState.aiPersona,
          tempGameState.chatHistory,
          accessToken
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

  }, [currentUserId, gameState, accessToken]);

  const handleResetScenario = async () => {
    if (!currentUserId) return;
    const newGameState: GameState = {
      aiPersona: null,
      chatHistory: [],
      activeJourneyId: undefined,
      currentJourneyStepId: undefined,
    };
    setGameState(newGameState);
    await saveSession(currentUserId, newGameState);
    setAppScreen(AppScreen.ONBOARDING_SCENARIO);
    setErrorMessage(null);
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
    switch (appScreen) {
      case AppScreen.LOGIN:
        return <LoginView onGoogleSignIn={handleGoogleSignIn} isLoading={isLoading} />;
      case AppScreen.ONBOARDING_SCENARIO:
        if (!userState) return <LoadingSpinner />;
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
      default:
        setAppScreen(AppScreen.ONBOARDING_SCENARIO);
        return <div className="text-center p-5 dark:text-white">Unknown screen state. Redirecting...</div>;
    }
  };

  if (isLoading || !userState) {
    return <LoadingSpinner />;
  }

  console.log("Final render state:", { isLoading, userState, appScreen });
  return (
    <div className="h-full bg-gray-50 flex flex-col dark:bg-gray-900">
      <Header
        userState={userState}
        onResetScenario={handleResetScenario}
      />
      <main className="flex-grow container mx-auto w-full max-w-4xl px-2 sm:px-4">
        {errorMessage && (
          <div className="p-4 my-4 text-sm text-red-700 bg-red-100 dark:bg-red-200 dark:text-red-800 rounded-lg shadow" role="alert">
            <span className="font-medium">Error:</span> {errorMessage} <button onClick={() => setErrorMessage(null)} className="float-right font-bold">X</button>
          </div>
        )}
        {renderScreen()}
      </main>
      <footer className="text-center p-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-auto">
        Aura © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
