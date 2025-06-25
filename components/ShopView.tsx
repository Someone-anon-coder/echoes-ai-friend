
import React from 'react';
import { UserState } from '../types';

interface ShopViewProps {
  userState: UserState;
  onInitiatePurchase: (amount: number, packageName: string) => void; // Changed from onBuyCredits
  onBack: () => void;
}

export interface CreditPackage { // Exporting for potential use in PaymentModal
  id: string;
  name: string;
  credits: number;
  description: string;
  bgColor: string;
  hoverBgColor: string;
}

export const creditPackages: CreditPackage[] = [ // Exporting for potential use in PaymentModal
  { id: 'pack10', name: 'Starter Pack', credits: 10, description: 'A small boost for your conversations.', bgColor: 'bg-blue-500', hoverBgColor: 'hover:bg-blue-600' },
  { id: 'pack50', name: 'Talkative Pack', credits: 50, description: 'Keep the chat going for longer!', bgColor: 'bg-green-500', hoverBgColor: 'hover:bg-green-600' },
  { id: 'pack100', name: 'Storyteller Pack', credits: 100, description: 'Plenty of credits for deep dives.', bgColor: 'bg-purple-500', hoverBgColor: 'hover:bg-purple-600' },
  { id: 'pack200', name: 'Echoes Bundle', credits: 200, description: 'The best value for extended interaction.', bgColor: 'bg-indigo-500', hoverBgColor: 'hover:bg-indigo-600' },
];

const ShopView: React.FC<ShopViewProps> = ({ userState, onInitiatePurchase, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6 bg-gray-50 dark:bg-gray-800/30">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">Credit Shop</h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">Your current credits: <span className="font-bold text-green-500 dark:text-green-400">{userState.credits}</span></p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {creditPackages.map((pkg) => (
            <div key={pkg.id} className={`p-6 rounded-lg shadow-lg text-white ${pkg.bgColor} flex flex-col justify-between`}>
              <div>
                <h3 className="text-xl font-semibold mb-1">{pkg.name}</h3>
                <p className="text-3xl font-bold mb-2">{pkg.credits} <span className="text-lg font-normal">Credits</span></p>
                <p className="text-sm opacity-90 mb-4">{pkg.description}</p>
              </div>
              <button
                onClick={() => onInitiatePurchase(pkg.credits, pkg.name)}
                className={`w-full py-2.5 font-semibold rounded-md bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm`}
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>
        
        <button
          onClick={onBack}
          className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ShopView;