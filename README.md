# Aura - Your Confidential Wellness Companion

This project is a submission for the **Google Cloud Gen AI Hackathon**, for the **Generative AI for Youth Mental Wellness** challenge.

## Project Overview

Aura is a web-based application designed to provide a safe, empathetic, and confidential space for youth to explore their feelings and engage in structured wellness exercises. It features an AI companion, powered by Google's Gemini API, that users can interact with. The core principle of Aura is user privacy, achieved through a secure Google Sign-In flow that allows the app to access the Gemini API on the user's behalf without ever exposing their private keys.

## Core Features

*   **Secure Google Sign-In**: Utilizes Firebase Authentication for a seamless and secure login experience.
*   **Seamless Google Sign-In for API Access**: Ensures user privacy and a smooth onboarding experience by using Google OAuth 2.0. Users grant the application permission to use the Gemini API on their behalf, eliminating the need for manual API key management.
*   **Empathetic AI Companion**: The AI, powered by the Gemini API, is designed to be a supportive and non-judgmental conversational partner.
*   **Structured Wellness Journeys**: Guided exercises for topics like Gratitude and Mindful Breathing to help users develop positive mental health habits.
*   **Daily Mood Tracking & Visualization**: Users can log their mood daily and see a chart of their mood over time, helping them recognize patterns.

## Live Prototype Link

[LINK TO LIVE DEMO](https://...)

## Tech Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **AI Model**: Google Gemini API (via Google AI Studio)
*   **Backend & Database**: Firebase Authentication & Cloud Firestore
*   **Deployment**: Firebase Hosting

## How It Works (Architecture)

Aura's architecture is built around Google's OAuth 2.0 protocol to provide a secure and user-friendly experience.

1.  **Google Sign-In**: The user signs in with their Google account through the standard Firebase popup.
2.  **OAuth Consent**: During the sign-in process, the application requests the user's permission (consent) to access the Google Generative Language API (`https://www.googleapis.com/auth/generative-language.retriever` scope).
3.  **Secure Token Handling**: Upon successful sign-in, Firebase provides a short-lived OAuth access token to the client.
4.  **Client-Side AI Processing**: This access token is used to make authenticated calls to the Gemini API directly from the user's browser. The token is securely managed by the application and refreshed automatically by Firebase, ensuring a high degree of confidentiality and a seamless user experience without manual key management.
5.  **Firebase for User Data**: Firebase is used for authentication and to store non-sensitive application state, such as mood history and completed journeys. No conversational data is stored in Firestore.

## Setup and Local Development

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/aura-wellness-app.git
    cd aura-wellness-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    - Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    - Add a new Web application to your project.
    - Copy the `firebaseConfig` object from your project settings.
    - Paste your configuration into the `firebaseConfig.ts` file in the root of this project.

4.  **Configure Google Cloud for OAuth:**
    - In the [Google Cloud Console](https://console.cloud.google.com/), navigate to your Firebase project.
    - Go to **APIs & Services -> OAuth consent screen**.
    - Configure the consent screen. For testing, you can keep it in "Testing" mode and add your own Google account as a test user.
    - Go to **APIs & Services -> Credentials**.
    - Find your web app's "OAuth 2.0 Client ID" and ensure your app's domain (e.g., `localhost` for local development, your Firebase hosting URL for production) is listed under "Authorized JavaScript origins".
    - You may need to add the client ID to your `firebaseConfig.ts` file if it's not already there.

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.
