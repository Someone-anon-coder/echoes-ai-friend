import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    deleteDoc,
    enableIndexedDbPersistence // For offline capabilities
} from 'firebase/firestore';
import firebaseConfig from '../firebaseConfig'; // Adjust path as necessary
import { UserState, GameState } from '../types'; // Adjust path as necessary
import { FREE_USER_INITIAL_CREDITS, PREMIUM_USER_DAILY_CREDITS, FREE_USER_DAILY_CREDITS } from '../constants'; // Moved import up

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence for Firestore.
// Handling potential errors during enablePersistence is important for production.
enableIndexedDbPersistence(db)
  .then(() => console.log("Firestore offline persistence enabled."))
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn('Firestore persistence failed: Multiple tabs open. Offline data might not be available.');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn('Firestore persistence failed: Browser does not support required features.');
    } else {
      console.error('Firestore persistence failed with error:', err);
    }
  });


const USERS_COLLECTION = 'users';
const GAMES_COLLECTION = 'games'; // Subcollection under each user for their game states

// === UserState Functions ===
export const saveUserStateToFirestore = async (userId: string, userState: UserState): Promise<void> => {
  if (!userId) throw new Error("User ID is required to save user state.");
  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), userState, { merge: true }); // Use merge:true to avoid overwriting fields unintentionally
    console.log(`UserState saved for user ${userId}`);
  } catch (error) {
    console.error(`Error saving UserState for user ${userId}:`, error);
    throw error; // Re-throw to allow calling function to handle
  }
};

export const loadUserStateFromFirestore = async (userId: string): Promise<UserState | null> => {
  if (!userId) return null;
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`UserState loaded for user ${userId}`);
      return docSnap.data() as UserState;
    } else {
      console.log(`No UserState found for user ${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error loading UserState for user ${userId}:`, error);
    throw error; // Re-throw
  }
};

export const deleteUserStateFromFirestore = async (userId: string): Promise<void> => {
    if (!userId) return; // Or throw error
    try {
        await deleteDoc(doc(db, USERS_COLLECTION, userId));
        console.log(`UserState deleted for user ${userId}`);
    } catch (error) {
        console.error(`Error deleting UserState for user ${userId}:`, error);
        throw error;
    }
};


// === GameState Functions ===
export const saveGameStateToFirestore = async (userId: string, gameState: GameState): Promise<void> => {
  if (!userId) throw new Error("User ID is required to save game state.");
  try {
    await setDoc(doc(db, USERS_COLLECTION, userId, GAMES_COLLECTION, 'activeGame'), gameState);
    console.log(`GameState saved for user ${userId}`);
  } catch (error) {
    console.error(`Error saving GameState for user ${userId}:`, error);
    throw error;
  }
};

export const loadGameStateFromFirestore = async (userId: string): Promise<GameState | null> => {
  if (!userId) return null;
  try {
    const docRef = doc(db, USERS_COLLECTION, userId, GAMES_COLLECTION, 'activeGame');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`GameState loaded for user ${userId}`);
      return docSnap.data() as GameState;
    } else {
      console.log(`No active GameState found for user ${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error loading GameState for user ${userId}:`, error);
    throw error;
  }
};

export const deleteGameStateFromFirestore = async (userId: string): Promise<void> => {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, USERS_COLLECTION, userId, GAMES_COLLECTION, 'activeGame'));
        console.log(`Active GameState deleted for user ${userId}`);
    } catch (error) {
        console.error(`Error deleting active GameState for user ${userId}:`, error);
        throw error;
    }
};

// Helper to create/update user profile document in Firestore upon sign-up or first sign-in.
// Also handles daily credit refresh.
export const upsertUserProfileDocument = async (
  firebaseUser: { uid: string; email?: string | null; displayName?: string | null },
  isPremiumOverride?: boolean // Optional: for admin or special cases
): Promise<UserState> => {
  if (!firebaseUser) throw new Error("Firebase user object is required.");

  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const today = new Date().toISOString().split('T')[0];

  if (!snapshot.exists()) {
    // New user
    const newUserState: UserState = {
      userId: firebaseUser.uid,
      isLoggedIn: true,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      credits: FREE_USER_INITIAL_CREDITS,
      isPremium: isPremiumOverride ?? false,
      premiumExpiryDate: null,
      lastLoginDate: today,
      createdAt: new Date().toISOString(),
      activeSubscription: null,
      pendingConsumables: {},
    };
    try {
      await setDoc(userRef, newUserState);
      console.log("New user profile created in Firestore:", firebaseUser.uid);
      return newUserState;
    } catch (error) {
      console.error("Error creating user profile document:", error);
      throw error;
    }
  } else {
    // Existing user
    const existingData = snapshot.data() as UserState;
    let creditsToAdd = 0;
    if (existingData.lastLoginDate !== today) {
      creditsToAdd = existingData.isPremium ? PREMIUM_USER_DAILY_CREDITS : FREE_USER_DAILY_CREDITS;
    }

    const updatedData: Partial<UserState> = {
      lastLoginDate: today,
      credits: existingData.credits + creditsToAdd,
      // Update email/displayName if they changed in Firebase Auth (e.g. user updated their Google profile)
      email: firebaseUser.email || existingData.email,
      displayName: firebaseUser.displayName || existingData.displayName,
    };
    if (isPremiumOverride !== undefined) {
        updatedData.isPremium = isPremiumOverride;
    }

    try {
      await setDoc(userRef, updatedData, { merge: true });
      console.log("User profile updated in Firestore:", firebaseUser.uid, "Credits added:", creditsToAdd);
      return { ...existingData, ...updatedData };
    } catch (error) {
      console.error("Error updating user profile document:", error);
      throw error;
    }
  }
};
