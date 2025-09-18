import React from 'react';
import { MoodLog } from '../types';

interface MoodLoggerProps {
  onLogMood: (mood: number) => void;
  moodHistory: MoodLog[];
}

const MoodLogger: React.FC<MoodLoggerProps> = ({ onLogMood, moodHistory }) => {
  const today = new Date().toISOString().split('T')[0];
  const hasLoggedToday = moodHistory.some(log => log.date === today);

  if (hasLoggedToday) {
    return (
      <div className="mood-logger-container">
        <p>Thanks for logging your mood today!</p>
      </div>
    );
  }

  return (
    <div className="mood-logger-container">
      <p>How are you feeling today?</p>
      <div className="mood-options">
        {[1, 2, 3, 4, 5].map(mood => (
          <button key={mood} onClick={() => onLogMood(mood)}>
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MoodLogger;
