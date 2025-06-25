
import React from 'react';
import { ChatMessage } from '../types';

interface MessageDisplayProps {
  message: ChatMessage;
  aiName?: string;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, aiName }) => {
  const parseText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remainingText = text;
    let keyIndex = 0;

    const tagRegex = /<(action|visual)>(.*?)<\/\1>/gs;
    let match;

    while ((match = tagRegex.exec(remainingText)) !== null) {
      const tagType = match[1];
      const tagContent = match[2];
      const precedingText = remainingText.substring(0, match.index);

      if (precedingText) {
        parts.push(<span key={`text-${keyIndex++}`}>{precedingText}</span>);
      }

      if (tagType === 'action') {
        parts.push(<span key={`action-${keyIndex++}`} className="block italic text-gray-500 dark:text-gray-400 my-1">{tagContent}</span>);
      } else if (tagType === 'visual') {
        parts.push(<span key={`visual-${keyIndex++}`} className="block italic text-gray-600 dark:text-gray-300 my-1 border-l-2 border-gray-400 dark:border-gray-500 pl-2">{tagContent}</span>);
      }
      remainingText = remainingText.substring(match.index + match[0].length);
    }

    if (remainingText) {
      parts.push(<span key={`text-${keyIndex++}`}>{remainingText}</span>);
    }
    return parts;
  };

  const senderName = message.sender === 'ai' ? (aiName || 'AI') : (message.sender === 'user' ? 'You' : 'System');
  
  const alignmentClass = 
    message.sender === 'user' ? 'items-end' :
    message.sender === 'ai' ? 'items-start' :
    'items-center'; // System messages centered

  let bubbleStyles = "p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg shadow-md"; // Common styles

  if (message.sender === 'user') {
    bubbleStyles += " bg-blue-500 text-white self-end rounded-br-sm"; 
  } else if (message.sender === 'ai') {
    bubbleStyles += " bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 self-start rounded-bl-sm";
  } else { // system message
    // Adjusted system message styling: less prominent background, centered, distinct.
    bubbleStyles = "bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 self-center w-full sm:w-11/12 md:w-3/4 lg:w-2/3 text-xs italic py-2 px-3 my-2 rounded-md shadow-sm text-center";
  }

  return (
    <div className={`flex flex-col mb-3 ${alignmentClass}`}>
      {message.sender !== 'system' && ( // Only show sender name for user/AI
        <span className={`text-xs text-gray-500 dark:text-gray-400 mb-0.5 ${message.sender === 'user' ? 'mr-2 self-end' : 'ml-2 self-start'}`}>
          {senderName}
        </span>
      )}
      <div className={bubbleStyles}>
        {parseText(message.text)}
      </div>
       {message.sender === 'system' && ( // Optional: explicitly label system messages if senderName isn't used elsewhere for them.
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 self-center">
          System Information
        </span>
      )}
    </div>
  );
};

export default MessageDisplay;
