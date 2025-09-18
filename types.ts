export enum AppScreen {
  LOGIN,
  ONBOARDING_SCENARIO,
  CHATTING,
}

export interface AIPersona {
  name: string; // This will always be "Aura"
  personalityTraits: string[];
  hobbies: string[];
  initialSystemMessage: string;
  firstAIMessage?: string;
  // For AI busy state
  isBusy: boolean;
  busyReason?: string;
  busyUntil?: number; // Timestamp
}

export interface MoodLog {
  date: string; // ISO date string (e.g., "2023-10-27")
  mood: number; // 1-5 rating
}

export interface UserState {
  userId: string | null;
  isLoggedIn: boolean;
  lastLoginDate?: string | null; // ISO date string for daily credit refresh
  moodHistory: MoodLog[];
  email?: string; // From Firebase Auth
  displayName?: string; // From Firebase Auth
  createdAt: any; // Can be FieldValue on create, Timestamp on read
}

export interface MoodAnalysis {
  sentiment: "Positive" | "Negative" | "Neutral";
  primaryEmotion: string;
  confidenceScore: number;
}

export interface ChatMessage {
  id:string;
  sender: "user" | "ai" | "system";
  text: string;
  timestamp: number;
  moodAnalysis?: MoodAnalysis;
  // For AI state when message was sent, if applicable
  aiStatus?: 'available' | 'busy';
}

export interface JourneyStep {
  stepId: number;
  type: 'PROMPT' | 'USER_INPUT';
  content: string;
}

export interface Journey {
  id: string;
  name: string;
  description: string;
  steps: JourneyStep[];
}

export interface GameState {
  aiPersona: AIPersona | null;
  chatHistory: ChatMessage[];
  activeJourneyId?: string;
  currentJourneyStepId?: number;
}

// Props for components that need access to user state and game state
export interface AppContextProps {
  userState: UserState;
  gameState: GameState;
  updateUserState: (newState: Partial<UserState>) => void;
  updateGameState: (newState: Partial<GameState>) => void;
  setAppScreen: (screen: AppScreen) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
}