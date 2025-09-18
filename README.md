# Aura - Your Confidential Wellness Companion

This project is a submission for the **Google Cloud Gen AI Hackathon**, for the **Generative AI for Youth Mental Wellness** challenge.

## Project Overview

Aura is a web-based application designed to provide a safe, empathetic, and confidential space for youth to explore their feelings and engage in structured wellness exercises. It features an AI companion, powered by Google's Gemini API, that users can interact with. The core principle of Aura is user privacy, achieved through a "Bring-Your-Own-Key" model that ensures no personal conversations are ever stored on a central server.

## Core Features

*   **Anonymous & Secure Login**: Utilizes Firebase Authentication for hassle-free anonymous sessions.
*   **Bring-Your-Own-Key Model**: Ensures user privacy and zero cost for the platform by having the user provide their own Gemini API key, which is stored only in their browser's local storage.
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

Aura's architecture is built around the "Bring-Your-Own-Key" (BYOK) model to maximize user privacy.

1.  **User-Provided API Key**: The user is prompted to enter their own Google Gemini API key.
2.  **Local Storage**: This key is stored exclusively in the browser's `localStorage`. It is **never** sent to or stored on any backend server associated with Aura.
3.  **Client-Side AI Processing**: All calls to the Gemini API are made directly from the user's browser. This means the conversation content, API key, and all interactions remain on the client-side, ensuring a high degree of confidentiality.
4.  **Firebase for User Data**: Firebase is used only for authentication (to create a unique, anonymous user ID) and to store non-sensitive application state, such as mood history and completed journeys. No conversational data is stored in Firestore.

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

3.  **Create a local environment file:**
    Duplicate the `.env.example` file and rename it to `.env.local`.

4.  **Get your Gemini API Key:**
    - Go to [Google AI Studio](https://aistudio.google.com/).
    - Click on "**Get API key**" and create a new key.
    - Copy the key.

5.  **Add your Firebase and Gemini API keys to `.env.local`:**
    You will need to create a Firebase project and add your web app configuration to the environment file. The Gemini key from the previous step should also be added.

6.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.
