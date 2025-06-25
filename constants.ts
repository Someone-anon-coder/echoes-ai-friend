
import { Scenario, RelationshipLevel } from './types';

export const GEMINI_API_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

export const FREE_SCENARIOS: Scenario[] = [
  { id: "rainy_shelter", name: "The Rainy Shelter", description: "You take shelter from a sudden downpour under a bookshop awning, only to find someone else already there.", isPremium: false },
  { id: "lost_tourist", name: "Lost Tourist", description: "You encounter a tourist looking quite lost and decide to offer help.", isPremium: false },
  { id: "coffee_shop_mixup", name: "Coffee Shop Mix-up", description: "A classic mix-up at a busy coffee shop leads to an unexpected introduction.", isPremium: false },
];

export const PREMIUM_SCENARIOS: Scenario[] = [
  { id: "volunteering_together", name: "Volunteering Together", description: "You meet while volunteering for a local cause, working side-by-side.", isPremium: true },
  { id: "rival_gaming_tournament", name: "Rival Gaming Tournament", description: "Sparks fly, not all of them friendly at first, at a competitive gaming event.", isPremium: true },
  { id: "art_class_partners", name: "Art Class Partners", description: "You're paired up for a project in an art class, forced to collaborate and connect.", isPremium: true },
];

export const ALL_SCENARIOS = [...FREE_SCENARIOS, ...PREMIUM_SCENARIOS];

export const INITIAL_RELATIONSHIP_SCORE = 25; // Acquaintance
export const MAX_RELATIONSHIP_SCORE = 100;
export const MIN_RELATIONSHIP_SCORE = 0;

export const CREDITS_PER_TURN = 1;
export const FREE_USER_INITIAL_CREDITS = 30;
export const FREE_USER_DAILY_CREDITS = 5;
export const PREMIUM_USER_INITIAL_CREDITS = 50;
export const PREMIUM_USER_DAILY_CREDITS = 20;

export const SUMMARIZE_CONVERSATION_TURN_INTERVAL = 10; // Every 10 turns (5 user, 5 AI)

export const RELATIONSHIP_THRESHOLDS: { score: number; level: RelationshipLevel }[] = [
  { score: 0, level: RelationshipLevel.STRANGER },
  { score: 25, level: RelationshipLevel.ACQUAINTANCE },
  { score: 50, level: RelationshipLevel.FRIEND },
  { score: 75, level: RelationshipLevel.CLOSE_FRIEND },
  { score: 100, level: RelationshipLevel.BEST_FRIEND },
];

export function getRelationshipLevel(score: number): RelationshipLevel {
  if (score <= 0) return RelationshipLevel.STRANGER;
  if (score <= 25) return RelationshipLevel.ACQUAINTANCE;
  if (score <= 50) return RelationshipLevel.FRIEND;
  if (score <= 75) return RelationshipLevel.CLOSE_FRIEND;
  return RelationshipLevel.BEST_FRIEND;
}

// AI Busy constants
export const AI_BUSY_CHANCE = 0.1; // 10% chance AI becomes busy after a response
export const AI_MIN_BUSY_DURATION_MS = 30 * 1000; // 30 seconds
export const AI_MAX_BUSY_DURATION_MS = 2 * 60 * 1000; // 2 minutes
export const AI_BUSY_REASONS = ["reading a fascinating article", "working on a personal project", "just lost in thought", "helping a friend with something", "learning a new skill"];