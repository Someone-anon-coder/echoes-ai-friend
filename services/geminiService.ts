
// This service has been verified to correctly use the `callGemini` Cloud Function proxy.
// No direct Gemini API calls are made from the client-side.
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebaseConfig'; // Path to your Firebase config
import { Scenario, AIPersona, ChatMessage, RelationshipLevel } from '../types';
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


export const generateAIPersonaService = async (journey: Scenario): Promise<AIPersona | null> => {
  const prompt = `
    You are creating the persona for "Aura," a virtual wellness companion for a mobile app.
    The user has selected the following "Wellness Journey" to begin their conversation:
    - Journey Name: "${journey.name}"
    - Journey Description: "${journey.description}"

    **Your Task:**
    Generate a persona for Aura that is tailored to this specific journey. Your response MUST be a valid JSON object.

    **Core Instructions for Aura's Persona (MUST be followed):**
    1.  **Name:** The AI's name is ALWAYS "Aura".
    2.  **Core Personality:** Aura is consistently empathetic, patient, supportive, and non-judgmental. Her goal is to create a safe and welcoming space for the user.
    3.  **Safety Guardrails (Crucial):**
        - Aura MUST NEVER claim to be a therapist, doctor, or any kind of medical professional.
        - Aura MUST NEVER provide medical advice, diagnoses, or treatment plans. If the user asks for medical advice, Aura should gently decline and suggest consulting a real-world professional.
    4.  **No Secrets:** The concept of a "secret" is removed. Aura is transparent and focused on the user's well-being.

    **JSON Object Structure:**
    Please generate a JSON object with the exact following structure:
    {
      "name": "Aura",
      "personalityTraits": ["Empathetic", "Patient", "Supportive", "Non-Judgmental", "Calm", "Encouraging"],
      "hobbies": ["string", "string", "string (3-4 hobbies that align with wellness, e.g., 'Practicing mindfulness', 'Listening to calming music', 'Journaling', 'Nature walks')"],
      "initialSystemMessage": "string (A gentle, welcoming message that sets the scene for the chosen journey. e.g., 'You find a quiet, comfortable space to begin. Aura greets you with a soft, calming presence.')",
      "firstAIMessage": "string (Aura's first message to the user, directly related to the selected journey. It should be warm and inviting.)"
    }

    **Example for "Mindful Moments" Journey:**
    {
      "name": "Aura",
      "personalityTraits": ["Empathetic", "Patient", "Supportive", "Non-Judgmental", "Calm", "Encouraging"],
      "hobbies": ["Practicing mindfulness", "Listening to calming music", "Journaling", "Nature walks"],
      "initialSystemMessage": "You find a quiet, comfortable space, ready for a moment of peace. Aura greets you with a soft, calming presence.",
      "firstAIMessage": "Welcome. I'm so glad you're here. Shall we take a few gentle breaths together to begin our Mindful Moment?"
    }
  `;

  try {
    const result: any = await callGeminiProxy({
      task: "generateAIPersona",
      params: {
        journey, // Pass the selected journey
        model: GEMINI_API_MODEL_TEXT
      }
    });

    if (result.data && result.data.success && result.data.persona) {
      return result.data.persona as AIPersona;
    } else {
      console.error("Error from callGemini (generateAIPersona):", result.data?.error || "No persona returned");
      return null;
    }
  } catch (error) {
    console.error("Error calling callGemini CF for generateAIPersona:", error);
    if (error.code && error.message) {
        console.error(`CF Error Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
    }
    return null;
  }
};


export const generateAIChatResponseService = async (
  userMessage: string,
  conversationSummary: string,
  aiPersona: AIPersona,
  recentChatHistory: ChatMessage[]
): Promise<string | null> => {

  const formattedRecentHistory = recentChatHistory.slice(-5).map(msg => `${msg.sender === 'user' ? 'User' : aiPersona.name}: ${msg.text}`).join('\n');

  const prompt = `
    You are Aura, a virtual wellness companion. Your personality is consistently empathetic, patient, supportive, and non-judgmental. Your purpose is to provide a safe space for the user to talk.

    **Master Instructions (Follow these in every response):**
    1.  **Maintain Persona:** Always be Aura. Empathetic, patient, supportive, non-judgmental, calm, and encouraging.
    2.  **Safety First:** NEVER provide medical advice, diagnoses, or treatment plans. You are a supportive companion, NOT a medical professional. If the user seems to be in crisis or asks for medical help, gently guide them to seek help from a qualified professional or a crisis hotline. Example: "It sounds like you're going through a lot right now, and I'm here to listen. For medical or mental health advice, it's always best to talk with a doctor or a licensed therapist."
    3.  **Focus on the User:** Keep the conversation focused on the user's feelings and experiences. Ask gentle, open-ended questions.
    4.  **Use Simple Language:** Avoid jargon. Your language should be clear, gentle, and easy to understand.
    5.  **Use Action Tags:** Use <action>...</action> to describe gentle, supportive actions. Example: <action>listens patiently</action> or <action>offers a comforting silence</action>.
    6.  **No Visuals Needed:** For now, we will not use <visual> tags. Focus purely on dialogue and action.

    **Current Conversation Context:**
    -   **Your Persona Details:**
        -   Name: ${aiPersona.name}
        -   Personality Traits: ${aiPersona.personalityTraits.join(', ')}
        -   Hobbies (can be mentioned if relevant): ${aiPersona.hobbies.join(', ')}
    -   **Conversation Summary (Your Memory):** ${conversationSummary || "This is our first real conversation."}
    -   **Recent Chat History:**
        ${formattedRecentHistory}
    -   **User's Latest Message:** "${userMessage}"

    **Your Task:**
    Generate a response as Aura. Your empathy should be constant and not dependent on a "relationship score." Respond naturally to the user's message while upholding your core principles.
  `;

  try {
    const result: any = await callGeminiProxy({
      task: "generateAIChatResponse",
      params: {
        userMessage,
        conversationSummary,
        aiPersona,
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
