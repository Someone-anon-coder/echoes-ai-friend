
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, AIPersona, UserState } from '../types';
import MessageDisplay from './MessageDisplay';
import LoadingSpinner from './LoadingSpinner';

interface ChatViewProps {
  userState: UserState;
  aiPersona: AIPersona;
  chatHistory: ChatMessage[];
  onSendMessage: (messageText: string) => Promise<void>; 
  isLoading: boolean; 
  initialSystemMessage?: string;
  // firstAIMessage prop is no longer passed or used
}

const ChatView: React.FC<ChatViewProps> = ({ 
  userState, 
  aiPersona, 
  chatHistory, 
  onSendMessage, 
  isLoading,
  initialSystemMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isActionTagOpen, setIsActionTagOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const localChatHistory: ChatMessage[] = useMemo(() => {
    const displayMessages: ChatMessage[] = [];
    if (initialSystemMessage) {
      displayMessages.push({
        id: 'initial-system-message', // Static ID for the system message
        sender: 'system',
        text: initialSystemMessage,
        timestamp: -1 // Ensure this system message is always first when sorted
      });
    }
    // gameState.chatHistory (passed as chatHistory prop) now contains AI's first message if applicable
    displayMessages.push(...chatHistory); 
    
    // Sort all messages to be displayed by timestamp.
    // This ensures system message is first, then AI's first message (timestamp 0), then others.
    displayMessages.sort((a, b) => a.timestamp - b.timestamp);
    return displayMessages;
  }, [initialSystemMessage, chatHistory]);

  const handleSend = async () => {
    if (inputText.trim() && !isLoading && userState.credits > 0) {
      const textToSend = inputText.trim();
      setInputText('');
      setIsActionTagOpen(false); // Reset action tag state
      await onSendMessage(textToSend);
    } else if (userState.credits <= 0) {
      alert("You're out of credits! Please wait for your daily refill or consider upgrading.");
    }
  };

  const handleActionTagToggle = () => {
    const tag = isActionTagOpen ? '</action>' : '<action>';
    setInputText(prev => prev + tag);
    setIsActionTagOpen(prev => !prev);
    inputRef.current?.focus();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localChatHistory]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-gradient-to-br from-gray-100 to-blue-50 dark:from-gray-800 dark:to-blue-900"> {/* Adjusted height for header */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-2">
        {localChatHistory.map((msg) => (
          <MessageDisplay key={msg.id} message={msg} aiName={aiPersona.name} />
        ))}
        {/* Loading spinner for AI response */}
        {isLoading && localChatHistory.length > 0 && localChatHistory[localChatHistory.length-1].sender === 'user' && ( 
           <div className="flex justify-start">
             <div className="p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg shadow-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 self-start rounded-bl-sm">
                <LoadingSpinner />
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-gray-300 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-top">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={userState.credits > 0 ? "Type your message..." : "Out of credits..."}
            className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow bg-gray-50 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isLoading || userState.credits <= 0}
          />
          <button
            onClick={handleActionTagToggle}
            disabled={isLoading || userState.credits <= 0}
            className={`px-3 py-3 ${isActionTagOpen ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base`}
            aria-pressed={isActionTagOpen}
            title={isActionTagOpen ? "End Action Tag" : "Start Action Tag"}
          >
            {isActionTagOpen ? 
              (<>End <span className="hidden sm:inline ml-1">Action</span></>) : 
              (<>Do <span className="hidden sm:inline ml-1">Action</span></>)
            }
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2">
                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-1.157 3.462 2.574 2.223L5.41 18.23l7.028-4.298 7.028 4.299-1.218-4.882 2.574-2.223-1.156-3.462-4.753-.39L10.868 2.884Zm1.222 6.095a.75.75 0 0 0-1.071-1.071L9.434 9.484l-1.017.084a.75.75 0 0 0-.695.965l.554 1.661a.75.75 0 0 0 .965.695l1.66-.554a.75.75 0 0 0 .696-.965l.084-1.017Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || userState.credits <= 0 || !inputText.trim()}
            className="px-4 sm:px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Send
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-2">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L11.25 9.25v1.5L4.643 12.011a.75.75 0 00-.95.826l-1.414 4.949a.75.75 0 00.826.95L17.553 10l-14.448-7.711z" />
            </svg>
          </button>
        </div>
        {userState.credits <= 0 && <p className="text-red-500 text-xs text-center mt-2">No credits remaining. Daily credits refresh at login.</p>}
      </div>
    </div>
  );
};

export default ChatView;
