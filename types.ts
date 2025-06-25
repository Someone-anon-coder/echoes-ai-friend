
export enum AppScreen {
  LOGIN, // New screen for user login
  ONBOARDING_SCENARIO,
  ONBOARDING_GENDER,
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

export enum AIGender {
  MALE = "Male",
  FEMALE = "Female",
  NON_BINARY = "Non-binary",
}

export interface AIPersona {
  name: string;
  gender: AIGender;
  hobbies: string[];
  personalityTraits: string[];
  secret: string;
  initialSystemMessage: string;
  firstAIMessage?: string; // Optional: AI's first message if it speaks first
  // For AI busy state
  isBusy: boolean;
  busyReason?: string; 
  busyUntil?: number; // Timestamp
}

export interface UserState {
  userId: string | null;
  isLoggedIn: boolean;
  credits: number;
  isPremium: boolean;
  premiumExpiryDate?: string | null; // ISO date string, for subscriptions
  lastLoginDate: string | null; // ISO date string for daily credit refresh
  email?: string; // From Firebase Auth
  displayName?: string; // From Firebase Auth
  createdAt?: string; // ISO date string for when the user profile was created in Firestore
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

export interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  timestamp: number;
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

export interface GameState {
  currentScenario: Scenario | null;
  aiPersona: AIPersona | null;
  relationshipScore: number; // 0-100
  chatHistory: ChatMessage[];
  conversationSummary: string; // Accumulated summaries for AI memory
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