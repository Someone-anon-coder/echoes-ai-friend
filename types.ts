
export enum AppScreen {
  LOGIN, // New screen for user login
  API_KEY_ENTRY,
  ONBOARDING_SCENARIO,
  CHATTING,
  GAME_OVER,
  PROFILE,
  SHOP,
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
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
  credits: number;
  isPremium: boolean;
  premiumExpiryDate?: string | null; // ISO date string, for subscriptions
  lastLoginDate?: string | null; // ISO date string for daily credit refresh
  moodHistory: MoodLog[];
  email?: string; // From Firebase Auth
  displayName?: string; // From Firebase Auth
  createdAt: any; // Can be FieldValue on create, Timestamp on read
  // To store active subscription tokens/IDs from Google Play for validation with backend
  activeSubscription?: { // Assuming one primary subscription type for "isPremium"
    productId: string; // e.g., "premium_monthly_echoes"
    purchaseToken: string; // Google Play purchase token
    expiryDate: string; // ISO date string, verified from Google Play
    provider: 'google_play'; // To support other providers later if needed
  } | null;
  // To store purchase tokens of non-consumed consumables for validation before granting value
  // This helps in reliably granting credits even if the app closes during purchase.
  // The key could be the purchaseToken itself.
  pendingConsumables?: {
    [purchaseToken: string]: {
      productId: string;
      timestamp: string; // ISO string of when purchase was initiated/recorded
      state: 'PENDING_VALIDATION' | 'VALIDATED_GRANTING' | 'COMPLETED' | 'FAILED';
    }
  };
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

export enum RelationshipLevel {
  STRANGER = "Stranger", // 0
  ACQUAINTANCE = "Acquaintance", // 1-25
  FRIEND = "Friend", // 26-50
  CLOSE_FRIEND = "Close Friend", // 51-75
  BEST_FRIEND = "Best Friend", // 76-100
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
  currentScenario: Scenario | null;
  aiPersona: AIPersona | null;
  relationshipScore: number; // 0-100
  chatHistory: ChatMessage[];
  conversationSummary: string; // Accumulated summaries for AI memory
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