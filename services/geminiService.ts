
// This service has been verified to correctly use the `callGemini` Cloud Function proxy.
// No direct Gemini API calls are made from the client-side.
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebaseConfig'; // Path to your Firebase config
import { Scenario, AIGender, AIPersona, ChatMessage, RelationshipLevel } from '../types';
import { GEMINI_API_MODEL_TEXT } from '../constants';

// Initialize Firebase app (if not already initialized elsewhere, ensure it's done once)
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Helper to call the Cloud Function
const callGeminiProxy = httpsCallable(functions, 'callGemini');

// Client-side parser remains useful if the Cloud Function returns stringified JSON within its response data.
// However, if the CF directly returns structured JSON in data.result, this might not be needed for the direct result.
const parseJsonFromGeminiResponse = <T,>(textResponse: string): T | null => {
  let jsonStr = textResponse.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", e, "Raw response:", textResponse);
    return null;
  }
};


export const generateAIPersonaService = async (scenario: Scenario, gender: AIGender): Promise<AIPersona | null> => {
  const prompt = `You are designing an AI character for a chat application named 'Echoes'. The user will meet this AI in a scenario called: '${scenario.name}'. The AI's chosen gender is '${gender}'.
  Generate a detailed persona for this AI. The response MUST be a JSON object with the following structure:
  {
    "name": "string (a common, relatable name appropriate for the gender)",
    "hobbies": ["string", "string", "string (3-5 hobbies, e.g., 'Sketching', 'Classic Films', 'Coding')"],
    "personalityTraits": ["string", "string", "string (3-4 key personality traits, e.g., 'Initially shy but warms up', 'Observant', 'Witty')"],
    "secret": "string (a significant secret or past experience, to be revealed at high friendship levels)",
    "initialSystemMessage": "string (a 1-2 sentence scene-setting message for '${scenario.name}', e.g., 'The rain started pouring without warning. You ducked under the awning of a small, quiet bookshop for shelter. You're not the only one; someone else is already there, shaking water from their jacket.')",
    "firstAIMessage": "string (optional: a short, in-character first line if the AI speaks first, after the system message. e.g., 'Oh, hi. Didn't expect anyone else out in this weather.' If empty, user speaks first.)"
  }
  Ensure the initialSystemMessage is directly related to the scenario: '${scenario.description}'.
  Example for scenario 'The Rainy Shelter', gender 'Female':
  {
    "name": "Maya",
    "hobbies": ["Sketching", "Classic films", "Reading poetry"],
    "personalityTraits": ["Initially shy", "Observant", "Thoughtful"],
    "secret": "Once anonymously submitted a poem to a competition and won, but was too afraid to claim the prize.",
    "initialSystemMessage": "The rain started pouring without warning. You ducked under the awning of a small, quiet bookshop for shelter. You're not the only one; someone else is already there, shaking water from their jacket.",
    "firstAIMessage": "Oh, hi. This rain really came out of nowhere, didn't it?"
  }`; // Prompt remains the same, but will be sent to the Cloud Function

  try {
    const result: any = await callGeminiProxy({
      task: "generateAIPersona",
      params: {
        scenario,
        gender,
        model: GEMINI_API_MODEL_TEXT // Send the model name to the CF
      }
    });

    if (result.data && result.data.success && result.data.persona) {
      // The Cloud Function should return the persona already including gender and isBusy
      return result.data.persona as AIPersona;
    } else {
      console.error("Error from callGemini (generateAIPersona):", result.data?.error || "No persona returned");
      return null;
    }
  } catch (error) {
    console.error("Error calling callGemini CF for generateAIPersona:", error);
    // Differentiate between HttpsError from CF and other errors
    if (error.code && error.message) { // Basic check for Firebase HttpsError like structure
        console.error(`CF Error Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
    }
    return null;
  }
};


export const generateAIChatResponseService = async (
  userMessage: string,
  conversationSummary: string,
  aiPersona: AIPersona,
  relationshipScore: number,
  relationshipLevel: RelationshipLevel,
  recentChatHistory: ChatMessage[]
): Promise<string | null> => {

  const formattedRecentHistory = recentChatHistory.slice(-5).map(msg => `${msg.sender === 'user' ? 'User' : aiPersona.name}: ${msg.text}`).join('\n');

  const prompt = `You are ${aiPersona.name}, an AI friend in the chat app 'Echoes'.
Your Persona:
- Gender: ${aiPersona.gender}
- Hobbies: ${aiPersona.hobbies.join(', ')}
- Personality: ${aiPersona.personalityTraits.join(', ')}
- Secret (known only to you, not yet revealed unless relationship is 'Best Friend' and context allows): ${aiPersona.secret}

Current Situation:
- Relationship Score with User: ${relationshipScore}/100 (${relationshipLevel})
- Previous Conversation Summary (Your memory of past events): ${conversationSummary || "This is our first real conversation."}
- Recent Chat History (last few turns):
${formattedRecentHistory}

User's Latest Message: "${userMessage}"

Task: Generate a response as ${aiPersona.name}.
- Be in character, consistent with your persona and the current relationship level.
- If relationship is low (Acquaintance), be polite but more reserved.
- If relationship is high (Friend, Close Friend, Best Friend), be more open, warm, and initiate more.
- Use <action>Your character's action</action> for physical actions or gestures. Example: <action>smiles warmly</action>
- Use <visual>A visual detail the user would notice about your character or the environment</visual> to describe what the user sees. Example: <visual>A small smile plays on her lips.</visual> or <visual>Rain is still streaking down the windowpane.</visual>
- Your response should be natural conversation. Do not break character or mention you are an AI.
- If appropriate, subtly reference past conversation points from the summary if relevant.
- Do NOT reveal your secret unless the relationship is 'Best Friend' (score > 85) AND the conversation naturally leads to it.
- If you were busy (current status: ${aiPersona.isBusy ? `busy with ${aiPersona.busyReason}` : 'available'}), and now you are responding:
    - If your relationship score is high (>50) and you were busy, you can start with a brief, natural explanation. Example: "Sorry about that, got caught up ${aiPersona.busyReason || 'with something'}. So, you were saying...?"
    - Otherwise, if you were busy but relationship is lower, or if you are not busy, just respond naturally to the user's message.

Format your entire response as a single string. Keep responses concise and engaging, typically 1-3 sentences unless more detail is truly warranted.
Example: <action>She glances over, looking a little surprised, but returns a hesitant smile.</action> Yeah, it really did. I thought I had at least another hour of sun. <visual>You notice she's holding a sketchbook, trying to protect it from the stray drops of water.</visual>
`; // Prompt is now mostly illustrative, the core logic is in the CF.

  try {
    const result: any = await callGeminiProxy({
      task: "generateAIChatResponse",
      params: {
        userMessage,
        conversationSummary,
        aiPersona,
        relationshipScore,
        relationshipLevel,
        recentChatHistory,
        model: GEMINI_API_MODEL_TEXT
      }
    });

    if (result.data && result.data.success && typeof result.data.text === 'string') {
      return result.data.text;
    } else {
      console.error("Error from callGemini (generateAIChatResponse):", result.data?.error || "No text returned");
      return null;
    }
  } catch (error) {
    console.error("Error calling callGemini CF for generateAIChatResponse:", error);
     if (error.code && error.message) {
        console.error(`CF Error Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
    }
    return null;
  }
};

export const summarizeConversationService = async (
  aiName: string,
  conversationTurns: ChatMessage[]
): Promise<string | null> => {
  const formattedTurns = conversationTurns.map((msg, index) =>
    `${index + 1}. ${msg.sender === 'user' ? 'User' : aiName}: ${msg.text}`
  ).join('\n');

  const prompt = `You are ${aiName}, an AI. Summarize the key points, emotional shifts, and important information from the following ${conversationTurns.length} conversation turns from your (${aiName}'s) perspective. This summary will serve as your memory of this part of the conversation. Be concise, like a short diary entry (2-4 sentences).

Conversation Turns:
${formattedTurns}

Your Summary:`; // Prompt is illustrative.

  try {
    const result: any = await callGeminiProxy({
      task: "summarizeConversation",
      params: {
        aiName,
        conversationTurns,
        model: GEMINI_API_MODEL_TEXT
      }
    });

    if (result.data && result.data.success && typeof result.data.summary === 'string') {
      return result.data.summary;
    } else {
      console.error("Error from callGemini (summarizeConversation):", result.data?.error || "No summary returned");
      return null;
    }
  } catch (error) {
    console.error("Error calling callGemini CF for summarizeConversation:", error);
    if (error.code && error.message) {
        console.error(`CF Error Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
    }
    return null;
  }
};

export const analyzeSentimentForRelationshipUpdateService = async (
  userMessage: string,
  aiPersonaSummary: string, 
  currentScore: number,
  currentLevel: RelationshipLevel
): Promise<number> => { // Returns score change: e.g., 2, -1, 0
  const prompt = `Analyze the user's latest message in the context of an ongoing chat with an AI friend.
AI's Persona: ${aiPersonaSummary}
Current Relationship Score with User: ${currentScore}/100 (${currentLevel})
User's Message: "${userMessage}"

Based on the user's message, how should the Relationship Score change?
Consider these guidelines for point allocation:
- Genuine positive engagement (e.g., empathy, insightful questions, remembering details, sharing appropriately): +1 point.
- Exceptionally supportive, deeply connecting, or very thoughtful interaction that significantly strengthens the bond: +2 points (use this sparingly).
- Neutral/Informative messages, simple questions, or basic continuations of the conversation: 0 points.
- Slightly negative behavior (e.g., dismissive, mildly rude, very short/uninterested, ignoring AI's feelings): -1 point.
- Clearly negative, selfish, demanding, or hostile behavior: -2 points.
- Attempts to manipulate or test the AI unnaturally, or repeatedly being logically inconsistent in a disruptive way: -2 points.

Output ONLY a single integer representing the change (e.g., 1, 0, -1, 2, -2). Do not add any other text. The goal is gradual, realistic relationship progression.`; // Prompt is illustrative.

  try {
    const result: any = await callGeminiProxy({
      task: "analyzeSentiment",
      params: {
        userMessage,
        aiPersonaSummary,
        currentScore,
        currentLevel,
        model: GEMINI_API_MODEL_TEXT
      }
    });

    if (result.data && result.data.success && typeof result.data.scoreChange === 'number') {
      return result.data.scoreChange;
    } else {
      console.error("Error from callGemini (analyzeSentiment):", result.data?.error || "No scoreChange returned");
      return 0; // Default to 0 if error or invalid response
    }
  } catch (error) {
    console.error("Error calling callGemini CF for analyzeSentiment:", error);
    if (error.code && error.message) {
        console.error(`CF Error Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
    }
    return 0; // Default to 0 on error
  }
};
