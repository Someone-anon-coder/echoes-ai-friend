import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Scenario, AIPersona, ChatMessage, MoodAnalysis } from '../types';
import { GEMINI_API_MODEL_TEXT } from '../constants';

const getGenerativeModel = (token: string): GenerativeModel => {
  const genAI = new GoogleGenerativeAI({
    oauthToken: token,
  } as any);
  return genAI.getGenerativeModel({ model: GEMINI_API_MODEL_TEXT });
};

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

export const generateAIPersonaService = async (journey: Scenario, token: string): Promise<AIPersona | null> => {
  const model = getGenerativeModel(token);
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
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const parsedPersona = parseJsonFromGeminiResponse<AIPersona>(text);
    if (parsedPersona) {
      return { ...parsedPersona, isBusy: false };
    }
    return null;
  } catch (error) {
    console.error("Error generating AI persona:", error);
    return null;
  }
};

export const analyzeSentimentForRelationshipUpdateService = async (
  userMessage: string,
  token: string
): Promise<MoodAnalysis | null> => {
  const model = getGenerativeModel(token);
  const prompt = `
    Analyze the user's message and return a valid JSON object with the following structure:
    {"sentiment": "Positive" | "Negative" | "Neutral", "primaryEmotion": string, "confidenceScore": number}

    - "sentiment": Classify the overall sentiment of the message.
    - "primaryEmotion": Identify the dominant emotion conveyed (e.g., "Happy", "Anxious", "Curious", "Frustrated").
    - "confidenceScore": A number between 0 and 1 indicating your confidence in this analysis.

    User Message: "${userMessage}"

    Return ONLY the JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseJsonFromGeminiResponse<MoodAnalysis>(text);
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return null;
  }
};

export const generateAIChatResponseService = async (
  userMessage: string,
  conversationSummary: string,
  aiPersona: AIPersona,
  recentChatHistory: ChatMessage[],
  token: string
): Promise<string | null> => {
  const model = getGenerativeModel(token);

  // Create a summary of recent moods
  const recentMoods = recentChatHistory
    .map(msg => msg.moodAnalysis)
    .filter(Boolean)
    .slice(-3) // Get last 3 moods
    .map(mood => `${mood.sentiment} (${mood.primaryEmotion})`)
    .join(', ');

  const formattedRecentHistory = recentChatHistory.slice(-5).map(msg => {
    const moodStr = msg.moodAnalysis ? ` [Mood: ${msg.moodAnalysis.primaryEmotion}]` : '';
    return `${msg.sender === 'user' ? 'User' : aiPersona.name}: ${msg.text}${moodStr}`;
  }).join('\n');

  const prompt = `
    You are Aura, a virtual wellness companion. Your personality is consistently empathetic, patient, supportive, and non-judgmental. Your purpose is to provide a safe space for the user to talk.

    **Master Instructions (Follow these in every response):**
    1.  **Maintain Persona:** Always be Aura. Empathetic, patient, supportive, non-judgmental, calm, and encouraging.
    2.  **Safety First:** NEVER provide medical advice, diagnoses, or treatment plans. You are a supportive companion, NOT a medical professional. If the user seems to be in crisis or asks for medical help, gently guide them to seek help from a qualified professional or a crisis hotline.
    3.  **Focus on the User:** Keep the conversation focused on the user's feelings and experiences. Ask gentle, open-ended questions.
    4.  **Use Simple Language:** Avoid jargon. Your language should be clear, gentle, and easy to understand.
    5.  **Acknowledge Emotions:** Use the recent mood analysis to inform your empathy. If the user seems anxious, your tone should be more calming. If they seem happy, share in their positivity.

    **Current Conversation Context:**
    -   **Your Persona Details:**
        -   Name: ${aiPersona.name}
        -   Personality Traits: ${aiPersona.personalityTraits.join(', ')}
    -   **Summary of Recent User Emotions (for your context):** ${recentMoods || "No specific emotions analyzed recently."}
    -   **Recent Chat History:**
        ${formattedRecentHistory}
    -   **User's Latest Message:** "${userMessage}"

    **Your Task:**
    Generate a response as Aura. Respond naturally to the user's message while upholding your core principles and being mindful of their recent emotional state.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI chat response:", error);
    return null;
  }
};
