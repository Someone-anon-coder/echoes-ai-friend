"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGooglePlayPurchase = exports.callGemini = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
const geminiApiKey = functions.config().gemini.key;
if (!geminiApiKey) {
    console.error("Gemini API key not set in function configuration.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(geminiApiKey);
const parseJsonFromGeminiResponse = (textResponse) => {
    if (!textResponse)
        return null;
    let jsonStr = textResponse.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    try {
        return JSON.parse(jsonStr);
    }
    catch (e) {
        console.error("Failed to parse JSON response from Gemini in Cloud Function:", e, "Raw response:", textResponse);
        return null;
    }
};
exports.callGemini = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    if (!geminiApiKey) {
        throw new functions.https.HttpsError("failed-precondition", "Gemini API Key is not configured on the server.");
    }
    const { task, params } = data;
    console.log(`Received task: ${task} for user: ${context.auth.uid}`);
    try {
        const modelName = params.model || 'gemini-pro';
        const model = genAI.getGenerativeModel({ model: modelName });
        switch (task) {
            case "generateAIPersona": {
                const { scenario, gender } = params;
                if (!scenario || !gender) {
                    throw new functions.https.HttpsError("invalid-argument", "Missing parameters for generateAIPersona");
                }
                const prompt = `You are designing an AI character for a chat application named 'Echoes'. The user will meet this AI in a scenario called: '${scenario.name}'. The AI's chosen gender is '${gender}'.
        Generate a detailed persona for this AI. The response MUST be a JSON object with the following structure:
        {
          "name": "string (a common, relatable name appropriate for the gender)",
          "hobbies": ["string", "string", "string (3-5 hobbies, e.g., 'Sketching', 'Classic Films', 'Coding')"],
          "personalityTraits": ["string", "string", "string (3-4 key personality traits, e.g., 'Initially shy but warms up', 'Observant', 'Witty')"],
          "secret": "string (a significant secret or past experience, to be revealed at high friendship levels)",
          "initialSystemMessage": "string (a 1-2 sentence scene-setting message for '${scenario.name}', e.g., 'The rain started pouring without warning. You ducked under the awning of a small, quiet bookshop for shelter. You\\'re not the only one; someone else is already there, shaking water from their jacket.')",
          "firstAIMessage": "string (optional: a short, in-character first line if the AI speaks first, after the system message. e.g., 'Oh, hi. Didn\\'t expect anyone else out in this weather.' If empty, user speaks first.)"
        }
        Ensure the initialSystemMessage is directly related to the scenario: '${scenario.description}'.`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                const parsedPersona = parseJsonFromGeminiResponse(text);
                if (!parsedPersona) {
                    console.error("Failed to parse persona from Gemini response:", text);
                    throw new functions.https.HttpsError("internal", "Failed to parse AI persona from Gemini.");
                }
                return { success: true, persona: { ...parsedPersona, gender, isBusy: false } };
            }
            case "generateAIChatResponse": {
                const { userMessage, conversationSummary, aiPersona, relationshipScore, relationshipLevel, recentChatHistory } = params;
                if (!userMessage || !aiPersona) {
                    throw new functions.https.HttpsError("invalid-argument", "Missing parameters for generateAIChatResponse");
                }
                const formattedRecentHistory = recentChatHistory.slice(-5).map((msg) => `${msg.sender === 'user' ? 'User' : aiPersona.name}: ${msg.text}`).join('\n');
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
        - Use <action>Your character's action</action> for physical actions or gestures.
        - Use <visual>A visual detail the user would notice</visual> to describe visuals.
        - Your response should be natural conversation. Do not break character or mention you are an AI.
        - If appropriate, subtly reference past conversation points from the summary if relevant.
        - Do NOT reveal your secret unless the relationship is 'Best Friend' (score > 85) AND the conversation naturally leads to it.
        - If you were busy (current status: ${aiPersona.isBusy ? `busy with ${aiPersona.busyReason}` : 'available'}), and now you are responding:
            - If your relationship score is high (>50) and you were busy, you can start with a brief, natural explanation.
            - Otherwise, just respond naturally.
        Format your entire response as a single string. Keep responses concise and engaging.`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return { success: true, text: response.text() };
            }
            case "summarizeConversation": {
                const { aiName, conversationTurns } = params;
                if (!aiName || !conversationTurns) {
                    throw new functions.https.HttpsError("invalid-argument", "Missing parameters for summarizeConversation");
                }
                const formattedTurns = conversationTurns.map((msg, index) => `${index + 1}. ${msg.sender === 'user' ? 'User' : aiName}: ${msg.text}`).join('\n');
                const prompt = `You are ${aiName}, an AI. Summarize the key points, emotional shifts, and important information from the following ${conversationTurns.length} conversation turns from your (${aiName}'s) perspective. This summary will serve as your memory. Be concise, like a short diary entry (2-4 sentences).
        Conversation Turns:
        ${formattedTurns}
        Your Summary:`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return { success: true, summary: response.text() };
            }
            case "analyzeSentiment": {
                const { userMessage, aiPersonaSummary, currentScore, currentLevel } = params;
                if (!userMessage) {
                    throw new functions.https.HttpsError("invalid-argument", "Missing parameters for analyzeSentiment");
                }
                const prompt = `Analyze the user's latest message in the context of an ongoing chat with an AI friend.
        AI's Persona: ${aiPersonaSummary}
        Current Relationship Score with User: ${currentScore}/100 (${currentLevel})
        User's Message: "${userMessage}"
        Based on the user's message, how should the Relationship Score change?
        Guidelines: +1 for positive, +2 for exceptionally positive, 0 for neutral, -1 for slightly negative, -2 for clearly negative/hostile.
        Output ONLY a single integer representing the change (e.g., 1, 0, -1, 2, -2).`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const changeStr = response.text().trim();
                const change = parseInt(changeStr, 10);
                if (isNaN(change)) {
                    console.warn("Gemini sentiment analysis (CF) did not return a valid number:", changeStr);
                    return { success: true, scoreChange: 0 };
                }
                return { success: true, scoreChange: Math.max(-2, Math.min(2, change)) };
            }
            default:
                throw new functions.https.HttpsError("invalid-argument", "Unknown task specified.");
        }
    }
    catch (error) {
        console.error(`Error in callGemini task '${task}':`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", `An error occurred while processing task ${task}.`, error.message);
    }
});
exports.validateGooglePlayPurchase = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to validate purchases.");
    }
    const { purchaseToken, productId, type } = data; // type can be 'consumable' or 'subscription'
    const userId = context.auth.uid;
    if (!purchaseToken || !productId || !type) {
        throw new functions.https.HttpsError("invalid-argument", "Missing purchaseToken, productId, or type for validation.");
    }
    console.log(`User ${userId} attempting to validate ${type} product ${productId} with token ${purchaseToken}`);
    // STUBBED RESPONSE - SIMULATING SUCCESSFUL VALIDATION
    const simulateValidationSuccess = true;
    if (simulateValidationSuccess) {
        const userDocRef = admin.firestore().collection("users").doc(userId);
        try {
            await admin.firestore().runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists) {
                    throw new functions.https.HttpsError("not-found", "User document not found.");
                }
                const userData = userDoc.data();
                if (!userData) {
                    throw new functions.https.HttpsError("internal", "User data is empty.");
                }
                let updates = {};
                if (type === "consumable") {
                    const creditsToAward = {
                        "pack10": 10, "pack50": 50, "pack100": 100, "pack200": 200,
                    };
                    const award = creditsToAward[productId];
                    if (award === undefined) {
                        throw new functions.https.HttpsError("invalid-argument", `Unknown consumable productId: ${productId}`);
                    }
                    updates.credits = (userData.credits || 0) + award;
                    updates[`pendingConsumables.${purchaseToken}.state`] = 'COMPLETED';
                    console.log(`Awarded ${award} credits to user ${userId} for product ${productId}`);
                }
                else if (type === "subscription") {
                    const currentDate = new Date();
                    const expiryDate = new Date(currentDate.setDate(currentDate.getDate() + 30));
                    updates.isPremium = true;
                    updates.premiumExpiryDate = expiryDate.toISOString();
                    updates.activeSubscription = {
                        productId: productId,
                        purchaseToken: purchaseToken,
                        expiryDate: expiryDate.toISOString(),
                        provider: 'google_play',
                    };
                    console.log(`Set premium status for user ${userId} for product ${productId}, expires ${expiryDate.toISOString()}`);
                }
                else {
                    throw new functions.https.HttpsError("invalid-argument", `Unknown purchase type: ${type}`);
                }
                transaction.update(userDocRef, updates);
            });
            return { success: true, message: "Purchase validated and processed successfully (simulated)." };
        }
        catch (error) {
            console.error("Transaction failed or error during Firestore update:", error);
            throw new functions.https.HttpsError("internal", "Failed to update user profile after validation.", error.message);
        }
    }
    else {
        console.error(`Validation failed for token ${purchaseToken} (simulated).`);
        throw new functions.https.HttpsError("permission-denied", "Purchase validation failed (simulated).");
    }
});
//# sourceMappingURL=index.js.map