import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserState, GameState } from '../types';

/**
 * Fetches a user's profile from Firestore.
 * @param userId The user's unique Firebase Auth ID.
 * @returns A Promise that resolves to the UserState object or null if not found.
 */
export const getUserProfile = async (userId: string): Promise<UserState | null> => {
  const userDocRef = doc(db, 'users', userId);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    return userDocSnap.data() as UserState;
  } else {
    return null;
  }
};

/**
 * Creates a new user profile in Firestore with default values.
 * @param userId The user's unique Firebase Auth ID.
 */
export const createUserProfile = async (userId: string): Promise<void> => {
  const userDocRef = doc(db, 'users', userId);
  const newUserProfile = {
    isPremium: false,
    lastLoginDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    credits: 100, // Default credits for a new user
  };
  await setDoc(userDocRef, newUserProfile, { merge: true });
};

/**
 * Retrieves the most recent active session for a user.
 * @param userId The user's unique Firebase Auth ID.
 * @returns A Promise that resolves to the GameState object or null if no active session is found.
 */
export const getActiveSession = async (userId: string): Promise<GameState | null> => {
  const sessionsColRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsColRef, orderBy('createdAt', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const sessionDoc = querySnapshot.docs[0];
    return sessionDoc.data() as GameState;
  } else {
    return null;
  }
};

/**
 * Saves a new game session to Firestore.
 * @param userId The user's unique Firebase Auth ID.
 * @param gameState The game state object to save.
 */
export const saveSession = async (userId: string, gameState: GameState): Promise<void> => {
  const sessionsColRef = collection(db, 'users', userId, 'sessions');
  await addDoc(sessionsColRef, {
    ...gameState,
    createdAt: serverTimestamp(),
  });
};

/**
 * Updates a user's profile in Firestore.
 * @param userId The user's unique Firebase Auth ID.
 * @param userState The full UserState object to save.
 */
export const updateUserProfile = async (userId: string, userState: UserState): Promise<void> => {
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, userState, { merge: true });
};
