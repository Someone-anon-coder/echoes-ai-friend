
import { Journey } from './types';

export const GEMINI_API_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

export const JOURNEY_DEFINITIONS: Journey[] = [
  {
    id: 'gratitude-01',
    name: 'Find Gratitude',
    description: 'A short exercise to help you focus on the positive.',
    steps: [
      {
        stepId: 0,
        type: 'PROMPT',
        content:
          "Let's take a moment to find something to be grateful for. First, find a quiet space and get comfortable.",
      },
      {
        stepId: 1,
        type: 'PROMPT',
        content:
          'Think about your day so far. What is one small thing that brought you a bit of joy or peace?',
      },
      {
        stepId: 2,
        type: 'USER_INPUT',
        content: "Describe that one thing. There's no right or wrong answer.",
      },
      {
        stepId: 3,
        type: 'PROMPT',
        content:
          "Thank you for sharing. It's often the small things that make the biggest difference.",
      },
    ],
  },
  {
    id: 'breathing-01',
    name: 'Mindful Breathing',
    description: 'A simple breathing exercise to calm your mind.',
    steps: [
      {
        stepId: 0,
        type: 'PROMPT',
        content:
          "Let's start by finding a comfortable position, either sitting or lying down.",
      },
      { stepId: 1, type: 'PROMPT', content: 'Now, gently close your eyes.' },
      {
        stepId: 2,
        type: 'PROMPT',
        content: "Let's breathe in for 4 seconds.",
      },
      {
        stepId: 3,
        type: 'PROMPT',
        content: 'Hold your breath for 4 seconds.',
      },
      {
        stepId: 4,
        type: 'PROMPT',
        content: 'Now, breathe out for 4 seconds.',
      },
      { stepId: 5, type: 'PROMPT', content: 'And hold for 4 seconds.' },
      {
        stepId: 6,
        type: 'PROMPT',
        content: "Let's repeat that one more time. Breathe in... 2... 3... 4...",
      },
      { stepId: 7, type: 'PROMPT', content: 'Hold... 2... 3... 4...' },
      {
        stepId: 8,
        type: 'PROMPT',
        content: 'Breathe out... 2... 3... 4...',
      },
      { stepId: 9, type: 'PROMPT', content: 'And hold... 2... 3... 4...' },
      {
        stepId: 10,
        type: 'PROMPT',
        content:
          'You can now return to your normal breathing. I hope you feel a little more centered.',
      },
    ],
  },
];